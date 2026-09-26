
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GEMINI_API_KEY } from '../apiConfig';
// --- TRANSLATIONS (BỘ TỪ ĐIỂN NGÔN NGỮ) ---
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
    statusNeedNote: 'Photo captured. Add a voice or text note to continue.',
    statusCamFailed: 'Camera capture failed. Check permissions and try again.',
    statusListening: 'Listening… describe the issue, then release.',
    statusVoiceCaptured: 'Voice note captured.',
    statusVoiceNeedPhoto: 'Voice note captured. Take a photo to continue.',
    statusTypeDesc: 'Type a short description of the issue first.',
    statusNoteSavedNeedPhoto: 'Note saved. Take a photo to continue.',
    placeholderText: 'Describe the issue…',
    btnUse: 'Use',
    btnTakePhoto: 'Take Photo',
    btnHoldSpeak: 'Hold to Speak',
    btnRecording: 'Recording…',
    btnTextInput: 'Text Input',
    btnVoiceInput: 'Voice Input',
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
    alertSaveBody: 'This session copy is stored locally. Cloud sync comes next.',
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
    statusNeedNote: 'Đã chụp ảnh. Thêm ghi chú giọng nói hoặc văn bản để tiếp tục.',
    statusCamFailed: 'Lỗi chụp ảnh. Kiểm tra quyền truy cập và thử lại.',
    statusListening: 'Đang nghe… mô tả sự cố, sau đó thả nút ra.',
    statusVoiceCaptured: 'Đã ghi âm (Giả lập).',
    statusVoiceNeedPhoto: 'Đã ghi âm. Vui lòng chụp ảnh để tiếp tục.',
    statusTypeDesc: 'Vui lòng nhập mô tả ngắn gọn về sự cố trước.',
    statusNoteSavedNeedPhoto: 'Đã lưu ghi chú. Vui lòng chụp ảnh để tiếp tục.',
    placeholderText: 'Mô tả sự cố…',
    btnUse: 'Dùng',
    btnTakePhoto: 'Chụp ảnh',
    btnHoldSpeak: 'Giữ để nói',
    btnRecording: 'Đang thu âm…',
    btnTextInput: 'Nhập Văn bản',
    btnVoiceInput: 'Nhập Giọng nói',
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
    alertSaveBody: 'Bản sao này được lưu cục bộ. Bạn có thể xem trong Lịch sử (sẽ phát triển sau).',
    alertDiscardTitle: 'Hủy báo cáo?',
    alertDiscardBody: 'Ảnh, ghi chú và các trường bản nháp sẽ bị xóa sạch.',
    alertKeep: 'Tiếp tục sửa',
  }
};

type InputMode = 'voice' | 'text';
type ScreenPhase = 'capture' | 'analyzing' | 'report';

type FieldReport = {
  category: string;
  location: string;
  priority: string;
  issue: string;
  suggestedAction: string;
  summary: string;
};

// Văn bản giả lập khi thu âm
const MOCK_TRANSCRIPT =
  'Điều hòa ở khu vực lễ tân không hoạt động, khách đang phàn nàn là phòng rất nóng.';

function buildMockReport(notes: string): FieldReport {
  const trimmed = notes.trim();
  return {
    category: 'Hỏng thiết bị',
    location: 'Khu vực Lễ tân',
    priority: 'Cao (High)',
    issue: 'Điều hòa không hoạt động',
    suggestedAction: 'Cử ngay nhân viên bảo trì đến kiểm tra hệ thống lạnh',
    summary: trimmed ? `Trích xuất từ giọng nói: "${trimmed}"` : 'Đã chụp ảnh hiện trường.',
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
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [textDraft, setTextDraft] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [statusMessage, setStatusMessage] = useState(t.statusInitial);

  const permissionsReady = cameraPermission != null;
  const permissionsGranted = cameraPermission?.granted === true;

  useEffect(() => {
    void requestCameraPermission();
  }, [requestCameraPermission]);

  useEffect(() => {
    if (phase === 'capture' && !photoUri && !notes && !isRecording) {
        setStatusMessage(t.statusInitial);
    }
  }, [lang, phase, photoUri, notes, isRecording, t]);

  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
      }
    };
  }, []);

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

        // Gọi trực tiếp API bằng HTTP request (Bypass lỗi thư viện)
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
        
        // Xử lý chuỗi JSON trả về
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const parsedReport = JSON.parse(jsonText);
            setReport(parsedReport);
        } catch (parseError) {
            console.error("Lỗi phân tích JSON từ AI:", parseError);
            setReport(buildMockReport(capturedNotes));
        }

      } catch (error) {
        console.error("Lỗi khi gọi Gemini API trực tiếp:", error);
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

  // Giả lập quá trình thu âm
  const startVoiceCapture = () => {
    if (phase !== 'capture' || isRecording || busy) return;
    setIsRecording(true);
    setStatusMessage(t.statusListening);
  };

  const stopVoiceCapture = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setNotes(MOCK_TRANSCRIPT);
    setStatusMessage(t.statusVoiceCaptured);
    
    if (photoUri) {
      beginAnalysis(photoUri, MOCK_TRANSCRIPT);
    } else {
      setStatusMessage(t.statusVoiceNeedPhoto);
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
    setIsRecording(false);
    setStatusMessage(t.statusInitial);
  };

  const saveReport = () => {
    Alert.alert(t.alertSaveTitle, t.alertSaveBody);
    resetCapture();
  };

  const discardReport = () => {
    Alert.alert(t.alertDiscardTitle, t.alertDiscardBody, [
      { text: t.alertKeep, style: 'cancel' },
      { text: t.btnDiscard, style: 'destructive', onPress: resetCapture },
    ]);
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
    <View style={styles.root}>
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

      <View style={styles.scrim} pointerEvents="none" />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.appKicker}>{t.fieldUtility}</Text>
          <Text style={styles.appTitle}>{t.appTitle}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
             <Pressable style={styles.langToggleBtn} onPress={toggleLang}>
                <Text style={styles.langToggleText}>{lang.toUpperCase()}</Text>
             </Pressable>
            <View style={styles.badge}>
              <View style={styles.liveDot} />
              <Text style={styles.badgeLabel}>{isRecording ? 'REC' : 'LIVE'}</Text>
            </View>
        </View>
      </View>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.thumb, { top: insets.top + 64 }]} />
      ) : null}

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.statusText}>{statusMessage}</Text>

        {inputMode === 'text' ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          </KeyboardAvoidingView>
        ) : null}

        <View style={styles.controlsRow}>
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

          <Pressable
            accessibilityRole="button"
            onPressIn={startVoiceCapture}
            onPressOut={stopVoiceCapture}
            disabled={inputMode !== 'voice' || phase !== 'capture'}
            style={({ pressed }) => [
              styles.holdButton,
              (pressed || isRecording) && styles.holdButtonActive,
              inputMode !== 'voice' && styles.disabled,
            ]}>
            <Text style={styles.holdLabel}>{isRecording ? t.btnRecording : t.btnHoldSpeak}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setInputMode((mode) => (mode === 'voice' ? 'text' : 'voice'))}
          style={styles.textModeButton}>
          <Text style={styles.textModeLabel}>
            {inputMode === 'voice' ? t.btnTextInput : t.btnVoiceInput}
          </Text>
        </Pressable>
      </View>

      {phase === 'analyzing' ? (
        <View style={styles.overlay} pointerEvents="auto">
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
    </View>
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
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(12, 18, 32, 0.82)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5A5F' },
  badgeLabel: { color: '#F4F7FB', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  thumb: { position: 'absolute', right: 16, width: 72, height: 96, borderRadius: 10, borderWidth: 2, borderColor: '#F5C518' },
  bottomPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(12, 18, 32, 0.92)', borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  statusText: { color: '#C5D0E0', fontSize: 13, lineHeight: 18 },
  controlsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  shutterWrap: { alignItems: 'center', gap: 6 },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F4F7FB' },
  shutterLabel: { color: '#F4F7FB', fontSize: 11, fontWeight: '700' },
  holdButton: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#1C2740', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#31405F' },
  holdButtonActive: { backgroundColor: '#5A1C22', borderColor: '#FF5A5F' },
  holdLabel: { color: '#F4F7FB', fontSize: 16, fontWeight: '700' },
  textModeButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#151C2C' },
  textModeLabel: { color: '#F5C518', fontSize: 13, fontWeight: '700' },
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
});