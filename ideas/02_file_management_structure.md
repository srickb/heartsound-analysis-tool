# 파일 관리 구조

## 목적

이 문서는 Tool 내부에서 파일이 어떻게 구성되고, 업로드되며, 식별되고, 연결되고, 활용되는지를 설명한다.

이 카테고리의 목적은 애플리케이션 전반의 동작을 뒷받침하는 현재의 file-role model을 문서화하는 것이다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- file role
- upload entry point
- 역할별 동작 방식
- sidebar 구성
- panel 할당 규칙
- auto-linking 규칙
- metadata 처리

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- signal analysis formula
- graph rendering behavior
- parameter card design
- wave playback control

## 핵심 파일 역할 모델

현재 Tool은 파일을 역할(role) 기준으로 구분한다.

현재 활성화된 role은 다음과 같다.

- `Data`
- `Wave`
- `Parameter`
- `Unsupervised`

각 role은 서로 다른 기능적 목적을 가진다.

## 1. Data

### 목적

`Data`는 가장 핵심적인 분석 입력 파일이다.

HeartSound의 경우:

- `Data`는 plotting에 사용되는 signal을 포함한다
- S1/S2 event logic에 사용되는 RS-score column을 포함한다
- 현재 파생 parameter 계산의 기준 데이터 역할을 한다

ECG의 경우:

- `Data`는 ECG plot에 필요한 raw signal과 marker channel을 포함한다

### HeartSound Data 기대 형식

HeartSound data 파일은 일반적으로 다음과 같은 column을 포함해야 한다.

- `Amplitude`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

이 column들은 시각화뿐 아니라 이후 cycle/parameter logic에도 사용된다.

## 2. Wave

### 목적

`Wave`는 오디오 역할을 담당하는 file role이다.

주요 용도는 다음과 같다.

- panel에 `.wav` 파일 연결
- playback control 지원
- 그래프와 playback position 동기화

### 허용 형식

현재 구현에서는 `Wave` role을 `.wav` 업로드 역할로 처리한다.

### 현재 UX 모델

사용자는 wave file을 그래프에 직접 업로드하지 않는다.  
대신 다음과 같은 흐름으로 동작한다.

- `Wave` 파일은 sidebar에 표시된다
- 해당 파일을 panel에 연결할 수 있다
- panel에 linked wave source가 존재할 때 playback control이 활성화된다

## 3. Parameter

### 현재 제품 내 역할

`Parameter` role은 현재도 file model 안에 존재하지만, 그 의미는 workspace에 따라 달라진다.

ECG의 경우:

- parameter file은 여전히 직접 업로드하는 입력 파일이다

HeartSound의 경우:

- 현재의 derived parameter display는 `Data`를 중심으로 동작한다
- 애플리케이션이 HeartSound data로부터 parameter 값을 직접 계산한다

즉, 구조적으로 `Parameter` role은 여전히 존재하지만, HeartSound에서는 메인 parameter window를 위해 별도의 parameter file 업로드에 직접 의존하지 않는다.

## 4. Unsupervised

### 목적

`Unsupervised` 파일은 보조적인 분석 맥락을 제공한다.

주요 용도는 다음과 같다.

- cluster 형태 또는 보조 summary 정보를 panel에 연결
- 추가적인 highlight 및 comparison workflow 지원

이 role은 핵심 parameter pipeline과는 분리된 채 유지된다.

## Sidebar 구조

좌측 sidebar는 파일 관리의 주요 인터페이스이다.

이 영역은 다음 기준으로 구성된다.

- 현재 선택된 workspace
- 현재 선택된 file role
- upload action button
- 검색 가능한 file list

사용자 흐름은 다음과 같다.

1. workspace 선택
2. file role 선택
3. 파일 업로드 또는 업로드된 파일 확인
4. 파일을 클릭하여 특정 panel에 할당하거나 연결

## 파일 목록 Metadata

각 파일 항목은 role에 맞는 metadata를 표시한다.

예시는 다음과 같다.

- tabular data 파일의 경우 `rows 57984`
- wave 파일의 경우 `WAV` 또는 확장자 기반 metadata

이 정보는 사용자가 분석용 데이터와 오디오 파일을 빠르게 구분하는 데 도움이 된다.

## Upload 경로 및 허용 파일 형식

현재 지원되는 upload 패턴은 다음과 같다.

- tabular role: `.csv`, `.xlsx`
- wave role: `.wav`

또한 UI는 다음 업로드 방식을 구분한다.

- single file upload
- folder upload

## Panel 할당 모델

파일은 전역적으로 활성화되지 않는다.  
대신 panel 단위로 연결된다.

즉:

- 하나의 `Data` 파일은 특정 panel에 할당된다
- `Wave`, `Parameter`, `Unsupervised` 파일은 같은 panel에 연결될 수 있다
- 서로 다른 panel은 서로 다른 분석 맥락을 가질 수 있다

이 구조는 side-by-side comparison mode에서 특히 중요하다.

## Auto-Linking 규칙

제품은 호환 가능한 파일들 사이에서 자동 연결(auto-linking) 동작을 지원한다.

현재 role pairing 예시는 다음과 같다.

- `Data` -> matching `Wave`
- `Data` -> naming rule이 맞는 linked analysis file

이 auto-linking logic은 filename normalization에 기반한다.

HeartSound에서는 현재 다음과 같은 식별자를 중심으로 동작한다.

- record number
- valve/location token

예시 패턴:

- `85252_PV_RS_Score.xlsx`
- `85252_PV.wav`

이 두 파일은 동일한 sync key를 공유하며, 대응되는 resource로 간주된다.

## Workspace 인식 구조

파일 동작은 workspace별로 달라진다.

HeartSound와 ECG는 동일한 기대 형식을 공유하지 않는다.

현재 file model은 다음 차이를 반영하도록 설계되어 있다.

- 서로 다른 column schema
- 서로 다른 role 의미
- 서로 다른 downstream consumer

## Metadata 및 Backend Registry

업로드된 파일은 다음과 같은 metadata와 함께 등록된다.

- `fileId`
- original name
- stored name
- workspace kind
- file role
- extension
- row count
- upload timestamp

이 registry는 다음 기능의 기반이 된다.

- file listing
- plot data lookup
- parameter summary lookup
- export lookup
- wave content serving

## 삭제 인터페이스

Sidebar에는 `Delete Files` 기능도 포함되어 있다.

즉, 현재 파일 관리는 단순히 파일을 추가하는 구조만이 아니라,  
사용자가 현재 UI를 통해 업로드된 asset을 제거할 수 있는 구조이기도 하다.

## 설계 의도

현재 file-management model은 다음 목적에 맞게 설계되어 있다.

- multi-source research workflow 지원
- 재현 가능한 panel linkage
- signal과 audio를 함께 검토하는 환경
- case 전환을 빠르게 할 수 있는 low-friction workflow

이 구조는 숨겨진 background loader보다 의도적으로 더 명시적인 방식으로 설계되어 있다.

## 현재 제약 사항

현재 시스템은 다음을 전제로 한다.

- 업로드된 파일이 role별 기대 schema를 따른다
- 이름 기반 auto-linking이 현재 dataset에서는 충분히 잘 동작한다
- panel이 파일 맥락을 구성하는 기본 단위이다

## 향후 확장 메모

이 카테고리는 향후 다음과 같은 방향으로 확장될 수 있다.

- 더 풍부한 folder semantic
- batch case grouping
- derived-file provenance
- 업로드 전 validation preview
- 더 강한 mismatch warning

## 요약

현재 file-management structure는 role 기반, panel-linked, workspace-aware 구조이며,  
모든 분석 입력을 일관된 운영 모델 안에서 관리한다.

이 구조는 plotting, audio playback, parameter generation, export, 그리고 auxiliary analysis를 뒷받침하는 data-ingestion layer이다.