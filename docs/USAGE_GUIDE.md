# Usage Guide

이 문서는 `Synthetic PCG Generation and 3D Cardiac Visualization Platform`를
로컬에서 실행하고 사용하는 최소 절차를 정리한 가이드입니다.

## 1. 실행 전 준비

필요한 것:

- Python 3.10 이상
- Node.js + npm

권장 위치:

- 프로젝트 루트: `C:\Users\LUI\Desktop\3D Heart Modeling`

## 2. 백엔드 실행

PowerShell에서:

```powershell
cd "C:\Users\LUI\Desktop\3D Heart Modeling\backend"
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .
uvicorn app.main:app --reload
```

정상 실행되면 기본 주소:

- API: `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`

브라우저에서 health 확인 시 아래와 비슷한 JSON이 나오면 정상입니다.

```json
{"status":"ok","stage":"parts-1-14-integrated"}
```

## 3. 프론트엔드 실행

새 PowerShell 창을 하나 더 열고:

```powershell
cd "C:\Users\LUI\Desktop\3D Heart Modeling\frontend"
npm install
npm run dev
```

정상 실행되면 보통 아래 주소가 열립니다.

- Frontend: `http://localhost:5173`

주의:

- 백엔드가 먼저 켜져 있어야 프론트엔드가 실제 데이터를 불러올 수 있습니다.

## 4. 가장 쉬운 첫 사용 순서

사이트가 열리면 아래 순서대로 사용하면 됩니다.

1. `Synthesis Control`에서 preset을 고릅니다.
2. 필요하면 `Signal class`, `Mode`, `Heart rate`, `Cycles`, `Murmur`, `Noise` 등을 조정합니다.
3. `Generate preview`를 누릅니다.
4. `Full Waveform`에서 전체 파형과 이벤트 마커를 봅니다.
5. `Cycle Viewer`에서 특정 cycle을 선택해서 자세히 봅니다.
6. `Reference Dataset`에서 샘플 CSV를 불러오거나 직접 CSV/XLSX를 업로드합니다.
7. `3D Heart Panel`에서 valve preset 버튼을 눌러 단순화된 밸브 상태를 확인합니다.
8. `Export and Validation`에서 export 또는 validation summary를 실행합니다.

## 5. 각 패널이 하는 일

### Synthesis Control

- 합성 파라미터를 바꿉니다.
- preset을 불러옵니다.
- waveform 모드 / single-cycle 모드를 바꿉니다.
- 실제 preview 생성을 시작합니다.

### Full Waveform

- 전체 synthetic waveform을 보여줍니다.
- cycle 경계와 이벤트 마커를 같이 봅니다.
- cycle 버튼을 눌러 관심 cycle을 고를 수 있습니다.

### Cycle Viewer

- 선택된 cycle 하나를 확대해서 봅니다.
- S1, systole, S2, diastole 구간과 메타데이터를 확인합니다.

### Reference Dataset

- `Load sample CSV`로 예제 데이터 `sample_data/reference_demo.csv`를 즉시 불러올 수 있습니다.
- 또는 CSV/XLSX 파일을 업로드할 수 있습니다.
- time/amplitude/label/score 컬럼 이름을 지정할 수 있습니다.
- synthetic cycle과 reference preview를 나란히 비교할 수 있습니다.

### 3D Heart Panel

- 실제 3D mesh viewer는 아니고, 현재는 가벼운 pseudo-3D 시각화입니다.
- 드래그로 회전할 수 있습니다.
- valve preset 버튼으로 stiffness / turbulence / incomplete closure 관련 상태를 빠르게 바꿉니다.

### Export and Validation

- JSON / CSV / WAV로 waveform export 가능
- metadata JSON export 가능
- cycle summary CSV export 가능
- validation summary를 통해 나중 DNN 연결용 feature shape와 summary 확인 가능

## 6. Reference 파일 업로드 방법

### CSV

가능하면 header가 있는 형태로 준비:

```csv
time_sec,amplitude,label,rs_score
0.000,0.01,baseline,0.12
0.010,0.08,s1,0.20
```

권장 컬럼:

- `time_sec`
- `amplitude`
- `label`
- `rs_score`

### XLSX

- 첫 번째 시트 또는 지정한 sheet 이름을 사용합니다.
- 복잡한 수식/병합셀/특수 workbook 구조는 현재는 잘 안 맞을 수 있습니다.

## 7. Export 결과는 어디에 저장되나

export를 실행하면 프로젝트 루트의 아래 폴더에 저장됩니다.

- `exports/`

예:

- `exports/synthetic_pcg_session_waveform.json`
- `exports/synthetic_pcg_session_metadata.json`
- `exports/synthetic_pcg_session_cycles.csv`

또는 선택한 포맷에 따라:

- `exports/..._waveform.csv`
- `exports/..._waveform.wav`

## 8. 추천 테스트 루틴

처음에는 아래처럼 해보는 것이 가장 안전합니다.

1. preset을 `normal-baseline`으로 둡니다.
2. `Mode`는 `waveform`
3. `Generate preview`
4. `Load sample CSV`
5. `Validation summary`
6. `Export format`을 `json` 또는 `csv`로 두고 `Export artifacts`

그 다음:

- murmur enable
- signal class 변경
- noise/artifact 추가
- cycle mode로 단일 cycle 확인

순서로 확인하면 됩니다.

## 9. 잘 안 될 때 점검 순서

### 프론트 페이지는 열리는데 데이터가 안 나오는 경우

먼저 백엔드가 켜져 있는지 확인:

```powershell
curl http://localhost:8000/api/health
```

### `npm run dev`는 되는데 버튼이 동작하지 않는 경우

- 백엔드가 먼저 실행 중인지 확인
- 주소가 `http://localhost:8000` 인지 확인
- 브라우저 새로고침

### `python -m pytest`가 안 되는 경우

- 현재 환경에 dependency가 아직 설치되지 않았을 수 있습니다.
- 먼저 backend 가상환경 활성화 후 `pip install -e .` 실행

### `npm run build`가 안 되는 경우

- `npm install`이 아직 안 되었을 수 있습니다.
- `frontend/node_modules`가 있어야 합니다.

## 10. 현재 버전의 한계

- 3D panel은 full WebGL heart mesh viewer가 아닙니다.
- XLSX loader는 경량 구현이라 복잡한 workbook은 실패할 수 있습니다.
- validation은 DNN 자체 실행이 아니라 연결 준비용 summary 단계입니다.
- frontend build/test는 실제 dependency 설치 후 한 번 더 검증하는 것이 좋습니다.

## 11. 한 줄 요약

실행 순서는:

1. backend 실행
2. frontend 실행
3. 브라우저에서 preset 선택
4. generate preview
5. reference 비교
6. export / validation 사용
