import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GEMINI_API_KEY } from '../apiConfig';

type LangMode = 'en' | 'vi';

const translations = {
  en: {
    errBoundaryTitle: 'Something went wrong',
    tryAgain: 'Try again',
    reqAccess: 'Requesting camera access…',
    accessNeeded: 'Access needed',
    accessDesc: 'AI Field Assistant needs camera permission to capture site photos. Enable it in system settings, then try again.',
    grantPerm: 'Grant permissions',
    fieldUtility: 'FIELD UTILITY',
    appTitle: 'AI Field Assistant',
    statusInitial: 'Frame the issue, then capture and describe it.',
    statusNoPhoto: 'Could not capture photo. Try again.',
    statusNeedNote: 'Photo captured. Add a text note to continue.',
    statusCamFailed: 'Camera capture failed. Check permissions and try again.',
    statusTypeDesc: 'Type a short description of the issue first.',
    statusNoteSavedNeedPhoto: 'Note saved. Take a photo to continue.',
    placeholderText: 'Describe the issue…',
    btnUse: 'Use',
    btnTakePhoto: 'Take Photo',
    btnTextInput: 'Text Input',
    btnHistory: 'History',
    analyzingTitle: 'Analyzing capture',
    analyzingBody: 'Reviewing the photo and notes. Building a structured field report…',
    reportKicker: 'STRUCTURED REPORT',
    reportTitle: 'Review before saving',
    lblCategory: 'Category',
    lblLocation: 'Location',
    lblPriority: 'Priority',
    lblIssue: 'Issue',
    lblAction: 'Suggested action',
    lblSummary: 'Summary',
    btnDiscard: 'Discard',
    btnSave: 'Save Report',
    alertSaveTitle: 'Report saved',
    alertSaveBody: 'This report is stored locally on your device.',
    alertDiscardTitle: 'Discard report?',
    alertDiscardBody: 'The photo, notes, and draft fields will be cleared.',
    alertKeep: 'Keep editing',
  },
  vi: {
    errBoundaryTitle: 'Đã xảy ra lỗi',
    tryAgain: 'Thử lại',
    reqAccess: 'Đang yêu cầu quyền máy ảnh…',
    accessNeeded: 'Cần cấp quyền',
    accessDesc: 'AI Field Assistant cần quyền máy ảnh để chụp ảnh hiện trường. Hãy bật trong cài đặt hệ thống, sau đó thử lại.',
    grantPerm: 'Cấp quyền',
    fieldUtility: 'CÔNG CỤ HIỆN TRƯỜNG',
    appTitle: 'Trợ lý Hiện trường',
    statusInitial: 'Đưa sự cố vào khung hình, chụp và mô tả nó.',
    statusNoPhoto: 'Không thể chụp ảnh. Vui lòng thử lại.',
    statusNeedNote: 'Đã chụp ảnh. Thêm văn bản mô tả để tiếp tục.',
    statusCamFailed: 'Lỗi chụp ảnh. Kiểm tra quyền truy cập và thử lại.',
    statusTypeDesc: 'Vui lòng nhập mô tả ngắn gọn về sự cố trước.',
    statusNoteSavedNeedPhoto: 'Đã lưu ghi chú. Vui lòng chụp ảnh để tiếp tục.',
    placeholderText: 'Mô tả sự cố…',
    btnUse: 'Dùng',
    btnTakePhoto: 'Chụp ảnh',
    btnTextInput: 'Nhập Văn bản',
    btnHistory: 'Lịch sử',
    analyzingTitle: 'Đang phân tích AI',
    analyzingBody: 'Đang đánh giá ảnh và ghi chú. Đang tạo báo cáo hiện trường…',
    reportKicker: 'BÁO CÁO CẤU TRÚC',
    reportTitle: 'Xem lại trước khi lưu',
    lblCategory: 'Danh mục',
    lblLocation: 'Vị trí',
    lblPriority: 'Mức độ',
    lblIssue: 'Sự cố',
    lblAction: 'Đề xuất xử lý',
    lblSummary: 'Tóm tắt',
    btnDiscard: 'Hủy bỏ',
    btnSave: 'Lưu báo cáo',
    alertSaveTitle: 'Đã lưu báo cáo',
    alertSaveBody: 'Báo cáo này đã được lưu vào bộ nhớ cục bộ trên thiết bị.',
    alertDiscardTitle: 'Hủy báo cáo?',
    alertDiscardBody: 'Ảnh, ghi chú và các trường bản nháp sẽ bị xóa sạch.',
    alertKeep: 'Tiếp tục sửa',
  }
};

type ScreenPhase = 'capture' | 'analyzing' | 'report';

type FieldReport = {
  id?: string;
  category: string;
  location: string;
  priority: string;
  issue: string;
  suggestedAction: string;
  summary: string;
  photoUri?: string | null;
  createdAt?: string;
};

function buildMockReport(notes: string): FieldReport {
  const trimmed = notes.trim();
  return {
    category: 'Hỏng thiết bị',
    location: 'Khu vực hiện trường',
    priority: 'Trung bình',
    issue: trimmed || 'Sự cố thiết bị',
    suggestedAction: 'Cử nhân sự đến kiểm tra',
    summary: trimmed ? `Mô tả: "${trimmed}"` : 'Đã ghi nhận sự cố.',
  };
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.centered}>
      <StatusBar style="light" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
      <Pressable style={styles.primaryButton} onPress={() => void retry()}>
        <Text style={styles.primaryButtonLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [lang, setLang] = useState<LangMode>('vi');
  const t = translations[lang];

  const [phase, setPhase] = useState<ScreenPhase>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [textDraft, setTextDraft] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [statusMessage, setStatusMessage] = useState(t.statusInitial);

  const [history, setHistory] = useState<FieldReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const permissionsReady = cameraPermission != null;
  const permissionsGranted = cameraPermission?.granted === true;

  useEffect(() => {
    void requestCameraPermission();
    loadHistory();
  }, [requestCameraPermission]);

  useEffect(() => {
    if (phase === 'capture' && !photoUri && !notes) {
        setStatusMessage(t.statusInitial);
    }
  }, [lang, phase, photoUri, notes, t]);

  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
      }
    };
  }, []);

  const loadHistory = async () => {
    try {
      const storedData = await AsyncStorage.getItem('@report_history');
      if (storedData) {
        setHistory(JSON.parse(storedData));
      }
    } catch (e) {
      console.log("Lỗi tải lịch sử:", e);
    }
  };

  const clearAnalyzeTimer = () => {
    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
  };

  const beginAnalysis = useCallback(
    async (capturedUri: string, capturedNotes: string) => {
      if (!capturedUri || !capturedNotes.trim()) return;
      clearAnalyzeTimer();
      setPhase('analyzing');
      setStatusMessage(t.analyzingTitle);

      try {
        const promptText = `
          Bạn là một trợ lý AI chuyên nghiệp cho kỹ sư hiện trường.
          Hãy phân tích văn bản ghi chú sau và tạo ra một báo cáo có cấu trúc.
          
          Văn bản ghi chú: "${capturedNotes}"
          
          Vui lòng trả về kết quả dưới định dạng JSON chính xác như sau, không thêm bất kỳ văn bản nào khác:
          {
            "category": "Phân loại sự cố (ví dụ: Hỏng thiết bị, An toàn, Môi trường...)",
            "location": "Vị trí xảy ra sự cố (trích xuất từ văn bản nếu có, nếu không ghi 'Không rõ')",
            "priority": "Mức độ ưu tiên (Cao, Trung bình, Thấp)",
            "issue": "Mô tả ngắn gọn cốt lõi của sự cố",
            "suggestedAction": "Hành động khắc phục đề xuất",
            "summary": "Tóm tắt lại tình huống trong 1-2 câu"
          }
        `;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );

        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        let jsonText = result.candidates[0].content.parts[0].text || '';
        
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const parsedReport = JSON.parse(jsonText);
            setReport(parsedReport);
        } catch (parseError) {
            setReport(buildMockReport(capturedNotes));
        }

      } catch (error) {
        console.log("Kích hoạt chế độ dự phòng do sự cố kết nối AI.");
        setReport(buildMockReport(capturedNotes));
      } finally {
        setPhase('report');
      }
    },
    [t]
  );

  const takePhoto = async () => {
    if (!cameraReady || busy || phase !== 'capture') return;
    try {
      setBusy(true);
      const picture = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      if (!picture?.uri) {
        setStatusMessage(t.statusNoPhoto);
        return;
      }
      setPhotoUri(picture.uri);
      if (notes.trim()) {
        beginAnalysis(picture.uri, notes);
      } else {
        setStatusMessage(t.statusNeedNote);
      }
    } catch {
      setStatusMessage(t.statusCamFailed);
    } finally {
      setBusy(false);
    }
  };

  const submitTextNote = () => {
    const nextNotes = textDraft.trim();
    if (!nextNotes) {
      setStatusMessage(t.statusTypeDesc);
      return;
    }
    setNotes(nextNotes);
    if (photoUri) {
      beginAnalysis(photoUri, nextNotes);
    } else {
      setStatusMessage(t.statusNoteSavedNeedPhoto);
    }
  };

  const resetCapture = () => {
    clearAnalyzeTimer();
    setPhase('capture');
    setPhotoUri(null);
    setNotes('');
    setTextDraft('');
    setReport(null);
    setStatusMessage(t.statusInitial);
  };

  const saveReport = async () => {
    if (!report) return;
    try {
      const newReport = {
        ...report,
        id: Date.now().toString(),
        photoUri: photoUri,
        createdAt: new Date().toLocaleString('vi-VN'),
      };
      const updatedHistory = [newReport, ...history];
      await AsyncStorage.setItem('@report_history', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);

      Alert.alert(t.alertSaveTitle, t.alertSaveBody);
      resetCapture();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể lưu báo cáo vào bộ nhớ.");
    }
  };

  const deleteSelectedReports = async () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} báo cáo đã chọn không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedHistory = history.filter(item => !selectedIds.includes(item.id!));
              await AsyncStorage.setItem('@report_history', JSON.stringify(updatedHistory));
              setHistory(updatedHistory);
              setSelectedIds([]);
              setIsSelectMode(false);
            } catch (e) {
              Alert.alert("Lỗi", "Không thể xóa báo cáo.");
            }
          }
        }
      ]
    );
  };

  const toggleSelectReport = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const discardReport = () => {
    Alert.alert(t.alertDiscardTitle, t.alertDiscardBody, [
      { text: t.alertKeep, style: 'cancel' },
      { text: t.btnDiscard, style: 'destructive', onPress: resetCapture },
    ]);
  };

  // Hàm Share & Export định dạng chuẩn Biên bản Word
  const shareReport = async (reportData: FieldReport) => {
    try {
      const reportContent = `
BIÊN BẢN KIỂM TRA HIỆN TRẠNG SỰ CỐ
---------------------------------
📍 Vị trí: ${reportData.location}
🕒 Thời gian: ${reportData.createdAt || new Date().toLocaleString('vi-VN')}
⚠️ Mức độ ưu tiên: ${reportData.priority}

1. Phân loại sự cố:
- ${reportData.category}

2. Mô tả sự cố:
- ${reportData.issue}

3. Hành động đề xuất / Khắc phục:
- ${reportData.suggestedAction}

4. Tóm tắt:
- ${reportData.summary}

---------------------------------
*Báo cáo được tạo tự động bởi AI Field Assistant*
      `.trim();

      await Share.share({
        message: reportContent,
        title: 'Báo cáo sự cố hiện trường',
      });
    } catch (error) {
      console.log("Lỗi chia sẻ:", error);
    }
  };

  const toggleLang = () => setLang(prev => prev === 'en' ? 'vi' : 'en');

  if (!permissionsReady) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" />
        <ActivityIndicator color="#F5C518" size="large" />
        <Text style={styles.muted}>{t.reqAccess}</Text>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>{t.accessNeeded}</Text>
        <Text style={styles.errorBody}>{t.accessDesc}</Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestCameraPermission()}>
          <Text style={styles.primaryButtonLabel}>{t.grantPerm}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      {phase === 'capture' ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
      ) : (
        <View style={styles.cameraPlaceholder} />
      )}

      <View style={[styles.scrim, { pointerEvents: 'none' as any }]} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.appKicker}>{t.fieldUtility}</Text>
          <Text style={styles.appTitle}>{t.appTitle}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
           <Pressable style={styles.langToggleBtn} onPress={() => setShowHistory(true)}>
              <Text style={styles.langToggleText}>{t.btnHistory} ({history.length})</Text>
           </Pressable>
           <Pressable style={styles.langToggleBtn} onPress={toggleLang}>
              <Text style={styles.langToggleText}>{lang.toUpperCase()}</Text>
           </Pressable>
        </View>
      </View>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.thumb, { top: insets.top + 64 }]} />
      ) : null}

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.statusText}>{statusMessage}</Text>

        <View style={styles.textRow}>
          <TextInput
            value={textDraft}
            onChangeText={setTextDraft}
            placeholder={t.placeholderText}
            placeholderTextColor="#8B97AB"
            style={styles.textInput}
            multiline
            returnKeyType="done"
            onSubmitEditing={submitTextNote}
          />
          <Pressable style={styles.submitChip} onPress={submitTextNote}>
            <Text style={styles.submitChipLabel}>{t.btnUse}</Text>
          </Pressable>
        </View>

        <View style={styles.controlsRowCenter}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void takePhoto()}
            disabled={busy || !cameraReady || phase !== 'capture'}
            style={({ pressed }) => [
              styles.shutterWrap,
              pressed && styles.pressed,
              (!cameraReady || busy) && styles.disabled,
            ]}>
            <View style={styles.shutter}>
              <View style={styles.shutterInner} />
            </View>
            <Text style={styles.shutterLabel}>{t.btnTakePhoto}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={showHistory} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#070B14', paddingTop: 60, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#F4F7FB' }}>Lịch sử báo cáo</Text>
            {history.length > 0 && (
              <Pressable 
                style={{ backgroundColor: isSelectMode ? '#3A4763' : '#151C2C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3A4763' }}
                onPress={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedIds([]);
                }}
              >
                <Text style={{ color: '#F5C518', fontWeight: '700', fontSize: 13 }}>
                  {isSelectMode ? 'Hủy chọn' : 'Chọn để xóa'}
                </Text>
              </Pressable>
            )}
          </View>

          <ScrollView>
            {history.length === 0 ? (
              <Text style={{ fontSize: 15, color: '#8B97AB' }}>Chưa có báo cáo nào được lưu cục bộ.</Text>
            ) : (
              history.map((item: any, index) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <Pressable 
                    key={index} 
                    onPress={() => {
                      if (isSelectMode) {
                        toggleSelectReport(item.id);
                      } else {
                        setSelectedReport(item);
                      }
                    }}
                    style={{ 
                      backgroundColor: isSelected ? '#1E293B' : '#151C2C', 
                      padding: 16, 
                      borderRadius: 14, 
                      marginBottom: 12, 
                      borderWidth: 1, 
                      borderColor: isSelected ? '#F5C518' : '#3A4763' 
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 17, color: '#F5C518', marginBottom: 6 }}>{item.category}</Text>
                        <Text style={{ fontSize: 14, color: '#C5D0E0', marginBottom: 4 }}>📍 Vị trí: {item.location}</Text>
                        <Text style={{ fontSize: 13, color: '#8B97AB', marginBottom: 6 }}>🕒 {item.createdAt || 'Gần đây'}</Text>
                        <Text style={{ fontSize: 14, color: '#8B97AB', fontStyle: 'italic' }} numberOfLines={1}>"{item.issue}"</Text>
                      </View>
                      {isSelectMode && (
                        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#F5C518', backgroundColor: isSelected ? '#F5C518' : 'transparent', justifyContent: 'center', alignItems: 'center', marginLeft: 10 }}>
                          {isSelected && <Text style={{ color: '#070B14', fontWeight: 'bold', fontSize: 12 }}>✓</Text>}
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {isSelectMode && selectedIds.length > 0 && (
            <Pressable 
              style={{ backgroundColor: '#FF5A5F', padding: 16, borderRadius: 14, alignItems: 'center', marginVertical: 10 }} 
              onPress={deleteSelectedReports}
            >
              <Text style={{ color: '#F4F7FB', fontSize: 16, fontWeight: '700' }}>Xóa ({selectedIds.length}) mục đã chọn</Text>
            </Pressable>
          )}

          <Pressable 
            style={{ backgroundColor: '#3A4763', padding: 16, borderRadius: 14, alignItems: 'center', marginVertical: 15 }} 
            onPress={() => {
              setShowHistory(false);
              setIsSelectMode(false);
              setSelectedIds([]);
            }}
          >
            <Text style={{ color: '#F4F7FB', fontSize: 16, fontWeight: '700' }}>Đóng</Text>
          </Pressable>
        </View>
      </Modal>

      {/* MODAL XEM CHI TIẾT VÀ NÚT CHIA SẺ */}
      <Modal visible={selectedReport != null} animationType="fade" transparent>
        <View style={styles.detailModalWrap}>
          <View style={styles.detailSheet}>
            <Text style={styles.reportKicker}>CHI TIẾT BÁO CÁO</Text>
            <Text style={styles.reportTitle}>{selectedReport?.category}</Text>
            
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              {selectedReport?.photoUri ? (
                <Image source={{ uri: selectedReport.photoUri }} style={styles.detailThumb} />
              ) : null}
              
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Vị trí</Text>
                <Text style={styles.detailValue}>{selectedReport?.location}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Mức độ ưu tiên</Text>
                <Text style={[styles.detailValue, { color: '#FF5A5F', fontWeight: '700' }]}>{selectedReport?.priority}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sự cố</Text>
                <Text style={styles.detailValue}>{selectedReport?.issue}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Hành động đề xuất</Text>
                <Text style={styles.detailValue}>{selectedReport?.suggestedAction}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tóm tắt</Text>
                <Text style={styles.detailValue}>{selectedReport?.summary}</Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {/* NÚT CHIA SẺ VÀ XUẤT */}
              <Pressable 
                style={[styles.saveButton, { flex: 1.2, backgroundColor: '#4CC9F0' }]} 
                onPress={() => shareReport(selectedReport!)}
              >
                <Text style={[styles.saveLabel, { color: '#0B132B' }]}>📤 Chia sẻ</Text>
              </Pressable>

              <Pressable 
                style={[styles.discardButton, { flex: 1 }]} 
                onPress={() => {
                  const targetId = selectedReport?.id;
                  setSelectedReport(null);
                  if (targetId) {
                    Alert.alert("Xác nhận", "Bạn có muốn xóa báo cáo này không?", [
                      { text: "Hủy", style: "cancel" },
                      { 
                        text: "Xóa", 
                        style: "destructive", 
                        onPress: async () => {
                          const updated = history.filter(item => item.id !== targetId);
                          await AsyncStorage.setItem('@report_history', JSON.stringify(updated));
                          setHistory(updated);
                        } 
                      }
                    ]);
                  }
                }}
              >
                <Text style={{ color: '#FF5A5F', fontWeight: '700' }}>Xóa</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.saveButton, { flex: 1 }]} 
                onPress={() => setSelectedReport(null)}
              >
                <Text style={styles.saveLabel}>Đóng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {phase === 'analyzing' ? (
        <View style={[styles.overlay, { pointerEvents: 'auto' as any }]} >
          <ActivityIndicator color="#F5C518" size="large" />
          <Text style={styles.overlayTitle}>{t.analyzingTitle}</Text>
          <Text style={styles.overlayBody}>{t.analyzingBody}</Text>
        </View>
      ) : null}

      <Modal visible={phase === 'report' && report != null} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.reportSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.reportKicker}>{t.reportKicker}</Text>
            <Text style={styles.reportTitle}>{t.reportTitle}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.reportForm}>
              <ReportField
                label={t.lblCategory}
                value={report?.category ?? ''}
                onChangeText={(value) => setReport((current) => current && { ...current, category: value })}
              />
              <ReportField
                label={t.lblLocation}
                value={report?.location ?? ''}
                onChangeText={(value) => setReport((current) => current && { ...current, location: value })}
              />
              <ReportField
                label={t.lblPriority}
                value={report?.priority ?? ''}
                onChangeText={(value) => setReport((current) => current && { ...current, priority: value })}
              />
              <ReportField
                label={t.lblIssue}
                value={report?.issue ?? ''}
                onChangeText={(value) => setReport((current) => current && { ...current, issue: value })}
                multiline
              />
              <ReportField
                label={t.lblAction}
                value={report?.suggestedAction ?? ''}
                onChangeText={(value) =>
                  setReport((current) => current && { ...current, suggestedAction: value })
                }
                multiline
              />
              <ReportField
                label={t.lblSummary}
                value={report?.summary ?? ''}
                onChangeText={(value) => setReport((current) => current && { ...current, summary: value })}
                multiline
              />
            </ScrollView>
            <View style={styles.reportActions}>
              <Pressable style={styles.discardButton} onPress={discardReport}>
                <Text style={styles.discardLabel}>{t.btnDiscard}</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={saveReport}>
                <Text style={styles.saveLabel}>{t.btnSave}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ReportField({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B14' },
  cameraPlaceholder: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#070B14' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(7, 11, 20, 0.18)' },
  centered: { flex: 1, backgroundColor: '#070B14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  langToggleBtn: { backgroundColor: '#151C2C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3A4763' },
  langToggleText: { color: '#F5C518', fontWeight: '700', fontSize: 12 },
  muted: { color: '#8B97AB', textAlign: 'center' },
  errorTitle: { color: '#F4F7FB', fontSize: 26, fontWeight: '700' },
  errorBody: { color: '#8B97AB', textAlign: 'center', lineHeight: 22 },
  primaryButton: { marginTop: 8, backgroundColor: '#F5C518', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14 },
  primaryButtonLabel: { color: '#1A1403', fontWeight: '700' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appKicker: { color: '#F5C518', fontSize: 11, letterSpacing: 1.6, fontWeight: '700' },
  appTitle: { color: '#F4F7FB', fontSize: 22, fontWeight: '700' },
  thumb: { position: 'absolute', right: 16, width: 72, height: 96, borderRadius: 10, borderWidth: 2, borderColor: '#F5C518' },
  bottomPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(12, 18, 32, 0.95)', borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  statusText: { color: '#C5D0E0', fontSize: 13, lineHeight: 18 },
  controlsRowCenter: { alignItems: 'center', paddingVertical: 4 },
  shutterWrap: { alignItems: 'center', gap: 6 },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F4F7FB' },
  shutterLabel: { color: '#F4F7FB', fontSize: 11, fontWeight: '700' },
  textRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  textInput: { flex: 1, minHeight: 44, maxHeight: 90, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#F4F7FB', backgroundColor: '#151C2C' },
  submitChip: { height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center' },
  submitChipLabel: { color: '#1A1403', fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(7, 11, 20, 0.86)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  overlayTitle: { color: '#F4F7FB', fontSize: 22, fontWeight: '700' },
  overlayBody: { color: '#8B97AB', textAlign: 'center', lineHeight: 22 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7, 11, 20, 0.55)' },
  reportSheet: { maxHeight: '92%', backgroundColor: '#101826', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  reportKicker: { color: '#F5C518', fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  reportTitle: { color: '#F4F7FB', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  reportForm: { gap: 12, paddingBottom: 16 },
  field: { gap: 6 },
  fieldLabel: { color: '#8B97AB', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { backgroundColor: '#151C2C', borderRadius: 12, color: '#F4F7FB', paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  fieldInputMultiline: { minHeight: 84 },
  reportActions: { flexDirection: 'row', gap: 10, paddingTop: 8 },
  discardButton: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#3A4763', alignItems: 'center', justifyContent: 'center' },
  discardLabel: { color: '#C5D0E0', fontWeight: '700' },
  saveButton: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center' },
  saveLabel: { color: '#1A1403', fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  detailModalWrap: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(7, 11, 20, 0.85)', padding: 20 },
  detailSheet: { backgroundColor: '#101826', borderRadius: 20, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: '#3A4763' },
  detailThumb: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#3A4763' },
  detailValue: { color: '#F4F7FB', fontSize: 15, backgroundColor: '#151C2C', padding: 12, borderRadius: 10 },
});