# HeartSound Analysis Tool: 제품 요구사항 정의서 (PRD)

Last updated: 2026-03-22  
Status: Draft  
Document owner: Product / Research / Implementation alignment document

이 문서는 `/Users/ms/Desktop/Tool` 프로젝트의 제품 수준 요구사항을 정리한다.
목적은 현재 구현된 연구용 HeartSound/ECG 분석 Tool을 기준으로, 제품의 목표,
사용자 workflow, 기능 요구사항, 비기능 요구사항, 규제 대응 방향, 단계별
로드맵을 한 문서 안에서 정렬하는 데 있다.

이 문서는 다음 역할을 가진다.

- 현재 구현 문서와 별도로 제품 목표와 방향을 정의한다.
- 무엇이 이미 구현되었고 무엇이 향후 목표인지 구분한다.
- 연구용 분석 Tool에서 제품화 가능한 소프트웨어로 확장할 때의 기준점을 만든다.

이 문서는 다음 문서와 함께 읽는 것을 권장한다.

- `process/current_implementation_spec.md`
- `process/heartsound_parameter_formula_reference.md`
- `ideas/12_prd_regulatory_and_approval_guide.md`

## 1. Executive Summary

HeartSound Analysis Tool은 HeartSound 및 ECG 신호를 업로드하고, 연결된 `wave`,
`parameter`, `unsupervised` 파일을 함께 검토하며, signal waveform, event
structure, cycle, parameter를 한 화면에서 해석할 수 있도록 지원하는 브라우저
기반 분석 소프트웨어이다.

현재 제품의 중심은 HeartSound workflow에 있다. 사용자는 S1/S2 기반 cycle 구조를
검토하고, S3/S4 candidate overlay를 확인하며, wave playback과 동기화된 chart를
기반으로 parameter를 cycle 단위로 확인할 수 있다. 또한 one-panel 또는 two-panel
비교 구조를 활용해 여러 데이터셋을 연구 목적으로 빠르게 비교할 수 있다.

현재 단계의 제품 성격은 연구실 내부 검증 및 알고리즘 구조화에 가까우며,
질환 확진이나 자동 임상 판정을 제공하는 제품으로 정의하지 않는다. 다만 향후에는
AI 기반 이벤트 검출, 파라미터 분석, 의료전문가 해석 지원 방향으로 확장 가능성이
있으므로, PRD 단계에서부터 제품 범위와 규제 대응 방향을 함께 관리한다.

## 2. Product Vision

본 제품의 비전은 심음 및 ECG 기반 분석 workflow를 하나의 일관된 작업 환경으로
통합하는 것이다.

사용자가 달성해야 하는 핵심 가치는 다음과 같다.

- 파일 업로드와 연결 확인에 시간을 덜 쓰고 분석에 집중할 수 있어야 한다.
- waveform, audio, cycle, parameter를 분리된 도구가 아니라 하나의 review flow에서
  이해할 수 있어야 한다.
- HeartSound 이벤트 구조를 사람이 더 빠르고 안정적으로 검토할 수 있어야 한다.
- 향후에는 연구용 분석을 넘어 의료전문가의 해석을 지원하는 제품 방향으로
  확장할 수 있어야 한다.

제품 비전의 핵심 문장은 다음과 같다.

> HeartSound 및 ECG 신호의 이벤트 구조와 파라미터를 시각적, 청각적, 구조적으로
> 함께 검토할 수 있는 분석 workspace를 제공하여, 연구 검토와 향후 임상 해석 지원의
> 기반을 만든다.

## 3. Problem Statement

현재 심음 및 ECG 기반 분석 workflow는 보통 다음 문제를 가진다.

- raw signal, audio, parameter, annotation이 서로 다른 파일과 도구에 분산된다.
- S1/S2 구조와 cycle을 사람이 반복적으로 수작업 확인해야 한다.
- 추가 이벤트 후보나 cycle 간 차이를 빠르게 비교하기 어렵다.
- chart와 parameter 사이를 계속 오가며 해석해야 한다.
- 연구 검토 결과를 외부 분석용 산출물로 다시 정리하는 데 시간이 든다.

본 제품은 이 문제를 다음 방식으로 줄이려 한다.

- 업로드 파일의 역할과 연결 관계를 구조화한다.
- waveform, playback, cycle, parameter를 한 panel workflow로 묶는다.
- candidate overlay와 cycle navigation으로 review 속도를 높인다.
- export 가능한 derived parameter 구조를 제공한다.

## 4. Target Users and Usage Context

### 4.1 Primary Users

- 연구자
- 생체신호 분석 실무자
- 내부 검증 담당자

### 4.2 Secondary / Future Users

- 의료전문가
- 의료기관 내 분석 지원 사용자
- 알고리즘 검증 및 품질 관리 담당자

### 4.3 Usage Context

현재 사용 환경은 연구실 또는 내부 검토 환경에 가깝다.

- 로컬 Mac 기반 launcher로 실행
- 브라우저 기반 dashboard 사용
- 필요 시 code 기반 제한 공유 또는 public share URL 사용
- dataset 비교, cycle 검토, 파라미터 확인, export 중심 workflow

향후 제품화 단계에서는 사용 환경이 다음으로 확장될 수 있다.

- 보다 구조화된 사용자 권한 관리
- 임상 해석 지원 맥락
- 의료기관 또는 외부 검토 환경에서의 사용

## 5. Current Product Context

현재 저장소 기준으로 실제 구현 상태는 다음과 같다.

- `heartsound`와 `ecg` workspace를 지원한다.
- 파일 역할은 `data`, `wave`, `parameter`, `unsupervised`로 구분된다.
- one-panel mode와 two-panel mode를 지원한다.
- HeartSound chart는 amplitude, RS score, S1/S2 area, S3/S4 candidate,
  cycle highlight, parameter measurement, unsupervised overlay, audio playhead를
  지원한다.
- wave playback은 header controls, seek, reset, speed cycle, draggable playhead를
  지원한다.
- HeartSound parameter는 별도 업로드 없이 `data` 파일에서 직접 파생된다.
- xlsx export가 가능하다.
- launcher, access mode, one-time code, share tunnel workflow가 존재한다.

이 PRD는 위 현재 상태를 기반으로 하지만, 현재 구현 문서 자체를 대체하지는 않는다.
구현 세부는 `process/current_implementation_spec.md`가 SSOT 역할을 가진다.

## 6. Product Scope and Non-Goals

### 6.1 In Scope

본 제품의 현재 및 근시일 목표 범위는 다음과 같다.

- HeartSound 및 ECG 파일 기반 분석 workspace 제공
- 역할별 파일 업로드 및 자동 연결
- HeartSound 중심 chart review workflow
- S1/S2 event structure visualization
- S3/S4 candidate visualization
- cycle-aware parameter review
- wave playback과 chart synchronization
- 연구용 export 및 비교 workflow
- 제한적 공유와 접근 제어

### 6.2 Non-Goals

현재 PRD 기준에서 다음 항목은 기본 범위 밖으로 둔다.

- 특정 질환의 자동 진단 또는 확진
- 치료 권고 또는 처방 지원
- 무인 자동 판정 시스템
- 임상 판단을 대체하는 risk score 제공
- 정식 의료기관 배포를 전제로 한 완성형 인증 제품 정의
- 대규모 SaaS 운영, 과금, 다중 조직 멀티테넌시

### 6.3 Scope Boundary Rule

문서 안에서 `현재 제품`과 `향후 목표`를 구분하는 기본 규칙은 다음과 같다.

- 현재 구현된 기능은 현재형으로 쓴다.
- 향후 만들 기능은 `목표`, `확장`, `향후`, `planned` 표현으로 쓴다.
- 임상 해석 지원과 규제 대응은 제품화 가능성의 방향으로만 쓴다.

## 7. Core Workflows

### 7.1 File Ingestion Workflow

사용자는 workspace별로 파일을 업로드한다.

- `data` 파일을 기본 분석 소스로 사용한다.
- 같은 base naming rule을 따르는 `wave`, `parameter`, `unsupervised` 파일은
  자동 연결된다.
- HeartSound에서는 parameter를 수동 업로드하는 방식보다 `data` 기반 파생이
  중심이다.

### 7.2 Review Workflow

사용자는 panel에서 다음 흐름으로 분석한다.

1. data 파일 선택
2. 자동 연결된 보조 파일 확인
3. waveform과 overlay 검토
4. cycle 선택 및 이동
5. parameter panel 확인
6. 필요 시 wave playback으로 청취 및 동기화 검토
7. 필요 시 second panel과 비교

### 7.3 Comparison Workflow

- one-panel mode로 단일 데이터에 집중할 수 있어야 한다.
- two-panel mode로 두 dataset 또는 두 조건을 나란히 비교할 수 있어야 한다.
- 각 panel의 상태는 독립적으로 조정 가능해야 한다.

### 7.4 Export Workflow

- 사용자는 현재 파생된 HeartSound parameter를 xlsx로 다운로드할 수 있어야 한다.
- export는 UI와 동일한 cycle-aware 구조를 반영해야 한다.
- metadata가 함께 기록되어 나중에 출처를 추적할 수 있어야 한다.

### 7.5 Sharing Workflow

- 내부 테스트나 데모 상황에서 접근 제어를 유지할 수 있어야 한다.
- `open` 또는 `code` 모드를 선택할 수 있어야 한다.
- 필요 시 share URL을 생성하여 외부에서 접근할 수 있어야 한다.

## 8. Functional Requirements

### FR-1. Runtime and Access

제품은 로컬에서 일관되게 실행, 중지, 상태 확인이 가능해야 한다.

수용 기준:

- `./start`로 frontend와 backend가 실행된다.
- `./stop_dev.sh`로 실행 프로세스를 종료할 수 있다.
- `./status_dev.sh`와 `./health_dev.sh`로 현재 상태를 확인할 수 있다.
- 접근 모드는 `open`과 `code`를 지원한다.
- code 모드에서는 1회용 숫자 code를 생성할 수 있다.

### FR-2. Workspace and File Role Management

제품은 workspace와 file role을 명확히 구분해야 한다.

수용 기준:

- `heartsound`와 `ecg` workspace를 지원한다.
- `data`, `wave`, `parameter`, `unsupervised` role을 지원한다.
- 유효하지 않은 파일 형식이나 필수 column 누락은 식별 가능해야 한다.
- matching rule에 따라 지원 파일을 자동 연결할 수 있어야 한다.

### FR-3. Panel-Based Analysis UI

제품은 panel 중심 분석 경험을 제공해야 한다.

수용 기준:

- one-panel mode와 two-panel mode를 지원한다.
- 각 panel은 header, chart, optional parameter 영역을 가진다.
- panel별로 reset, detail, settings, parameter toggle을 독립 제어할 수 있다.

### FR-4. HeartSound Event Visualization

제품은 HeartSound signal의 핵심 이벤트 구조를 시각적으로 검토할 수 있어야 한다.

수용 기준:

- amplitude waveform을 표시한다.
- RS score overlay를 표시할 수 있다.
- S1 area와 S2 area를 표시할 수 있다.
- S3/S4 candidate overlay를 표시할 수 있다.
- selected cycle 및 parameter measurement annotation을 표시할 수 있다.

### FR-5. Candidate Event Review

제품은 S3/S4를 확정 이벤트가 아니라 review-oriented candidate로 다뤄야 한다.

수용 기준:

- S3/S4는 candidate overlay로 분리 표현된다.
- candidate visibility를 사용자가 on/off 할 수 있다.
- candidate logic은 cycle 구조와 amplitude 기반 review 흐름에 연결된다.
- PRD 기준으로도 candidate를 진단 확정 이벤트로 표현하지 않는다.

### FR-6. Wave Playback and Synchronization

제품은 signal review와 audio review를 연결해야 한다.

수용 기준:

- linked wave가 panel header에 표시된다.
- play/pause, -5s, +5s, reset, slow-speed cycle을 지원한다.
- playback 위치가 chart playhead에 반영된다.
- playhead drag를 통한 seek를 지원한다.
- playback과 graph viewport가 필요한 범위에서 함께 이동한다.

### FR-7. Parameter Review Experience

제품은 cycle-aware parameter review를 제공해야 한다.

수용 기준:

- parameter panel을 표시/숨김할 수 있다.
- cycle selector와 highlight control을 제공한다.
- HeartSound parameter category를 구조적으로 표시한다.
- parameter card 클릭 시 graph measurement annotation과 연결된다.
- HR은 별도의 강조 card로 표시된다.

### FR-8. Derived Parameter Computation

HeartSound parameter는 `data` 파일로부터 일관되게 파생되어야 한다.

수용 기준:

- S1, S2, S1-S2 relation, RS score, HR family를 계산한다.
- invalid cycle은 명시적 validity rule에 따라 제외 또는 `NaN` 처리된다.
- formula 및 unit은 별도 reference 문서와 일치해야 한다.

### FR-9. Export and Documentation Support

제품은 연구 검토 결과를 외부로 가져갈 수 있어야 한다.

수용 기준:

- parameter xlsx export를 지원한다.
- export에는 parameter row와 metadata가 포함된다.
- documentation layer가 current implementation, PRD, formula reference로 구분된다.

### FR-10. Sharing and Controlled Access

제품은 간단한 내부 공유 또는 데모 공유를 지원해야 한다.

수용 기준:

- public share URL을 생성할 수 있다.
- share URL은 재사용 가능 상태를 확인할 수 있다.
- clipboard copy 같은 운영 편의가 제공된다.
- 이 공유 기능은 현재 로컬 기반 임시 공유 모델로 정의한다.

## 9. Data and Analysis Requirements

### 9.1 Supported Data Structure

HeartSound `data` 파일은 최소한 다음 축을 포함해야 한다.

- 시간 인덱스
- amplitude
- S1/S2 관련 RS-score channel

Wave는 `.wav` 형식이어야 하며, unsupervised 데이터는 cycle boundary와 cluster
정보를 포함해야 한다.

### 9.2 Cycle Definition Rule

HeartSound의 핵심 분석 단위는 valid cycle이다.

valid cycle은 다음 관계를 만족해야 한다.

- `S1_start < S1_end < S2_start < S2_end < next_S1_start`

이 정의는 chart highlight, parameter extraction, export, navigation의 공통 기준이 된다.

### 9.3 Event Interpretation Rule

- S1/S2는 primary event structure로 다룬다.
- S3/S4는 exploratory candidate로 다룬다.
- parameter는 stable cycle anchor에 근거해 계산한다.

### 9.4 Source of Truth Rule

- 현재 구현 동작은 `process/current_implementation_spec.md`
- parameter formula는 `process/heartsound_parameter_formula_reference.md`
- 규제 표현 원칙은 `ideas/12_prd_regulatory_and_approval_guide.md`

## 10. UX and Usability Requirements

제품은 연구 검토 상황에서 빠르게 읽히는 구조를 가져야 한다.

핵심 UX 요구사항은 다음과 같다.

- 파일 연결 상태를 panel header에서 즉시 이해할 수 있어야 한다.
- chart와 parameter panel 사이를 자주 오갈 필요가 없어야 한다.
- cycle 이동과 graph viewport 이동이 자연스럽게 이어져야 한다.
- overlay visibility를 사용자가 부담 없이 조절할 수 있어야 한다.
- S3/S4 candidate와 S1/S2 primary structure가 시각적으로 혼동되지 않아야 한다.
- tooltip은 짧고 해석 중심이어야 한다.

향후 제품화 단계에서 추가로 중요해질 항목은 다음과 같다.

- 오사용 가능성 감소
- candidate와 confirmed structure의 혼동 방지
- 의료전문가와 연구자 모두 이해 가능한 labeling
- 사용적합성 검토가 가능한 interaction 구조

## 11. Non-Functional Requirements

### 11.1 Local-First Operability

- 제품은 로컬 환경에서 안정적으로 실행 가능해야 한다.
- launcher 기반 start/stop/status flow가 유지되어야 한다.

### 11.2 Performance and Responsiveness

- 일반적인 review 동작에서 chart interaction이 과도하게 끊기지 않아야 한다.
- cycle 이동과 parameter refresh는 연구 검토 흐름을 방해하지 않아야 한다.
- wave playback 중 playhead와 viewport 동기화가 사용 가능한 수준으로 유지되어야 한다.

### 11.3 Persistence and Traceability

- 업로드 파일과 metadata는 추적 가능해야 한다.
- export는 source file context를 기록해야 한다.
- 문서화는 current implementation, product intent, formula reference로 분리되어야 한다.

### 11.4 Safety of Interpretation

- S3/S4는 candidate로 표현되어야 한다.
- 현재 제품은 질환 확진 도구처럼 읽히지 않아야 한다.
- parameter와 overlay는 해석 보조 수단으로 제시되어야 한다.

## 12. Regulatory and Approval Direction

본 제품은 현재 연구실 내부 검증 단계의 심음 및 ECG 분석 소프트웨어로 정의한다.
현 단계의 목적은 signal structure 검토, 이벤트 검출 구조 정리, 파라미터 산출,
visual review workflow 고도화에 있으며, 질병의 진단, 확진, 치료 판단을 직접
표방하지 않는다.

다만 향후 제품화 버전이 다음 기능과 연결될 경우 규제 성격이 달라질 수 있다.

- AI 기반 S1/S2 자동 검출
- S3/S4 후보 이벤트 분석
- 이벤트별 파라미터 분석 결과의 임상적 해석 지원
- 사용자 상태의 이상 여부, 스크리닝, 위험도 판단과의 연결

따라서 본 제품은 현재 연구용 프로토타입으로 출발하되, 상용화 단계에서는
독립형 디지털의료기기소프트웨어에 해당할 가능성을 전제로 MFDS 인허가 전략을
검토한다. 최종 규제 경로와 등급은 사용목적 문구, 기능 범위, 의료적 영향,
식약처 제품코드 및 등급 분류 판단을 거쳐 확정한다.

규제 관점의 작성 원칙은 다음과 같다.

- 현재 단계와 향후 허가 대상 단계를 구분해 쓴다.
- 진단 확정 표현보다 이벤트 검출 및 해석 지원 중심으로 쓴다.
- 의료기관 사용, 스크리닝, 위험도 제시 표현은 더 높은 규제 부담을 동반할 수 있으므로 신중히 다룬다.
- 데이터셋 이력, 모델 검증, 알고리즘 역할 분리, 사용적합성, 변경관리를 미리 준비한다.

세부 작성 원칙은 `ideas/12_prd_regulatory_and_approval_guide.md`를 따른다.

## 13. Success Metrics

현재 단계에서의 성공은 연구용 review workflow가 실제로 빨라지고 일관되어지는지로 판단한다.

핵심 제품 지표 예시는 다음과 같다.

- 사용자가 data 파일 업로드 후 연결 상태를 빠르게 확인할 수 있는가
- cycle 선택과 parameter 해석 흐름이 끊기지 않는가
- wave playback과 chart review가 자연스럽게 연결되는가
- S1/S2 구조와 candidate event를 빠르게 비교할 수 있는가
- export 결과가 재검토에 충분한 구조를 가지는가

향후 정량화 가능한 KPI 후보는 다음과 같다.

- 파일 업로드 후 분석 시작까지의 평균 시간
- cycle 간 이동 및 parameter 확인에 필요한 평균 시간
- review session 중 panel reset 또는 visibility toggle의 사용 효율
- export 후 외부 분석 재사용률
- 버전별 event detection 정확도 및 consistency

## 14. Roadmap

### Phase 1. Research Workflow Stabilization

목표:

- 현재 HeartSound 중심 workflow를 안정화한다.
- S1/S2 structure review, S3/S4 candidate review, parameter panel, export 흐름을
  일관되게 다듬는다.
- 현재 구현 문서와 formula 문서를 제품 문서와 정렬한다.

### Phase 2. Analysis Quality Expansion

목표:

- 이벤트 검출 품질과 parameter 체계를 더 명확히 정리한다.
- candidate event 로직과 설명 가능성을 높인다.
- dataset 검증 기록과 버전별 성능 비교 체계를 강화한다.

### Phase 3. Productization Preparation

목표:

- intended use 문구를 관리한다.
- 사용자 권한, 공유 구조, 보안, 문서화, 변경관리를 강화한다.
- 의료전문가 해석 지원 제품으로의 확장 가능성을 검토한다.
- MFDS 인허가 준비 범위를 단계적으로 정리한다.

## 15. Open Questions

현재 PRD 기준의 핵심 open question은 다음과 같다.

- ECG workflow를 HeartSound와 같은 수준으로 확장할 것인지
- AI 기반 S1/S2 검출을 실제 제품 핵심 value proposition으로 둘 것인지
- S3/S4를 candidate layer로 유지할지, 더 구조화된 feature family로 승격할지
- 연구용 product line과 향후 제품화 버전을 별도 문서로 나눌지
- 공유 기능을 단순 데모 도구로 유지할지, 정식 사용자 접근 구조로 확장할지

## 16. Summary

HeartSound Analysis Tool의 현재 제품 정체성은 연구용 HeartSound/ECG 분석 workspace이다.
핵심은 signal, audio, cycle, parameter를 하나의 review flow로 묶는 데 있다.

이 PRD는 다음 원칙을 유지한다.

- 현재 구현과 목표 기능을 구분한다.
- HeartSound 중심 workflow를 제품의 핵심으로 둔다.
- candidate event와 parameter 해석을 review-oriented 구조로 정의한다.
- 향후 제품화 가능성을 열어두되, 현 단계에서는 연구용 도구라는 포지션을 유지한다.

이 문서를 기준으로 이후 기능 추가, UI 정리, 검증 계획, 규제 문구 정리는
동일한 방향에서 이어져야 한다.
