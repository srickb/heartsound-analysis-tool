# Product Requirements Document (PRD)

## HeartSound / ECG Signal Analysis and Interpretation Support Tool

- 문서 상태: `Draft v1.0`
- 문서 성격: `제품 요구사항 및 규제 대응 방향 정리 문서`
- 주의사항: 본 문서는 제품 정의와 개발 방향을 정리하기 위한 PRD이며, 최종 법률 자문 또는 식약처 유권해석을 대체하지 않는다.

## Table of Contents

- [0. 규제 리스크](#0-규제-리스크)
- [1. 문서 목적](#1-문서-목적)
- [2. 제품 개요](#2-제품-개요)
  <details>
  <summary>하위 항목 보기</summary>

  - [2.1 제품 요약](#21-제품-요약)
  - [2.2 해결하려는 문제](#22-해결하려는-문제)
  - [2.3 제품 비전](#23-제품-비전)
  - [2.4 현재 공개적으로 확인 가능한 심음 분석 소프트웨어 정리](#24-현재-공개적으로-확인-가능한-심음-분석-소프트웨어-정리)

  </details>
- [3. 현재 제품 정의와 향후 제품 정의](#3-현재-제품-정의와-향후-제품-정의)
  <details>
  <summary>하위 항목 보기</summary>

  - [3.1 현재 제품 정의](#31-현재-제품-정의)
  - [3.2 향후 제품 정의 후보](#32-향후-제품-정의-후보)

  </details>
- [4. 대상 사용자 및 사용 환경](#4-대상-사용자-및-사용-환경)
  <details>
  <summary>하위 항목 보기</summary>

  - [4.1 1차 사용자](#41-1차-사용자)
  - [4.2 2차 사용자](#42-2차-사용자)
  - [4.3 현재 사용 환경](#43-현재-사용-환경)
  - [4.4 향후 사용 환경](#44-향후-사용-환경)

  </details>
- [5. 제품 목표와 비목표](#5-제품-목표와-비목표)
  <details>
  <summary>하위 항목 보기</summary>

  - [5.1 현재 단계 목표](#51-현재-단계-목표)
  - [5.2 향후 단계 목표](#52-향후-단계-목표)
  - [5.3 현재 단계 비목표](#53-현재-단계-비목표)

  </details>
- [6. 현재 구현 범위](#6-현재-구현-범위)
  <details>
  <summary>하위 항목 보기</summary>

  - [6.1 실행 및 접근 구조](#61-실행-및-접근-구조)
  - [6.2 파일 관리 구조](#62-파일-관리-구조)
  - [6.3 Panel 및 Layout 구조](#63-panel-및-layout-구조)
  - [6.4 Graph 및 Visualization 구조](#64-graph-및-visualization-구조)
  - [6.5 HeartSound Cycle 및 S1/S2 구조](#65-heartsound-cycle-및-s1s2-구조)
  - [6.6 S3 / S4 candidate 구조](#66-s3-s4-candidate-구조)
  - [6.7 Wave playback 구조](#67-wave-playback-구조)
  - [6.8 Parameter window 및 interaction](#68-parameter-window-및-interaction)
  - [6.9 현재 HeartSound parameter set](#69-현재-heartsound-parameter-set)
  - [6.10 Parameter computation rule](#610-parameter-computation-rule)
  - [6.11 Export 및 documentation 구조](#611-export-및-documentation-구조)

  </details>
- [7. 핵심 제품 요구사항](#7-핵심-제품-요구사항)
  <details>
  <summary>하위 항목 보기</summary>

  - [FR-01. Workspace 및 파일 입력](#fr-01-workspace-및-파일-입력)
  - [FR-02. Panel-linked review context](#fr-02-panel-linked-review-context)
  - [FR-03. One-panel / two-panel 비교](#fr-03-one-panel-two-panel-비교)
  - [FR-04. Graph visibility control](#fr-04-graph-visibility-control)
  - [FR-05. S1/S2 event structuring](#fr-05-s1s2-event-structuring)
  - [FR-06. Cycle-aware navigation](#fr-06-cycle-aware-navigation)
  - [FR-07. S3/S4 candidate support](#fr-07-s3s4-candidate-support)
  - [FR-08. Parameter-to-graph explainability](#fr-08-parameter-to-graph-explainability)
  - [FR-09. Audio-synchronized review](#fr-09-audio-synchronized-review)
  - [FR-10. Export](#fr-10-export)
  - [FR-11. Runtime observability](#fr-11-runtime-observability)
  - [FR-12. Documentation continuity](#fr-12-documentation-continuity)

  </details>
- [8. 데이터, 알고리즘, 검증 요구사항](#8-데이터-알고리즘-검증-요구사항)
  <details>
  <summary>하위 항목 보기</summary>

  - [8.1 데이터 요구사항](#81-데이터-요구사항)
  - [8.2 알고리즘 역할 분리](#82-알고리즘-역할-분리)
  - [8.3 최소 검증 endpoint](#83-최소-검증-endpoint)
  - [8.4 권장 내부 성능 게이트(초안)](#84-권장-내부-성능-게이트초안)

  </details>
- [9. 비기능 요구사항](#9-비기능-요구사항)
  <details>
  <summary>하위 항목 보기</summary>

  - [9.1 재현성](#91-재현성)
  - [9.2 해석 가능성](#92-해석-가능성)
  - [9.3 안정성](#93-안정성)
  - [9.4 운영 관측성](#94-운영-관측성)
  - [9.5 접근 통제](#95-접근-통제)
  - [9.6 문서화](#96-문서화)
  - [9.7 사용적합성](#97-사용적합성)

  </details>
- [10. 규제 및 허가 대응 방향](#10-규제-및-허가-대응-방향)
  <details>
  <summary>하위 항목 보기</summary>

  - [10.1 현재 규제 포지셔닝](#101-현재-규제-포지셔닝)
  - [10.2 향후 규제 포지셔닝 가정](#102-향후-규제-포지셔닝-가정)
  - [10.3 현재 PRD에서 금지하거나 주의할 표현](#103-현재-prd에서-금지하거나-주의할-표현)
  - [10.4 현재 PRD에서 권장하는 표현](#104-현재-prd에서-권장하는-표현)
  - [10.5 제품코드 및 등급 원칙](#105-제품코드-및-등급-원칙)

  </details>
- [11. 허가 대비 준비 산출물](#11-허가-대비-준비-산출물)
  <details>
  <summary>하위 항목 보기</summary>

  - [11.1 Intended use 관리](#111-intended-use-관리)
  - [11.2 데이터 및 라벨 관리](#112-데이터-및-라벨-관리)
  - [11.3 알고리즘 검증 문서](#113-알고리즘-검증-문서)
  - [11.4 UI / 사용적합성 문서](#114-ui-사용적합성-문서)
  - [11.5 보안 및 운영 문서](#115-보안-및-운영-문서)
  - [11.6 품질 및 변경관리 문서](#116-품질-및-변경관리-문서)

  </details>
- [12. 단계별 개발 및 규제 로드맵](#12-단계별-개발-및-규제-로드맵)
  <details>
  <summary>하위 항목 보기</summary>

  - [Stage 1. 연구용 프로토타입](#stage-1-연구용-프로토타입)
  - [Stage 2. 제품화 가능성 검토](#stage-2-제품화-가능성-검토)
  - [Stage 3. 허가 준비](#stage-3-허가-준비)

  </details>
- [13. 주요 리스크와 대응 방향](#13-주요-리스크와-대응-방향)
  <details>
  <summary>하위 항목 보기</summary>

  - [13.1 S3/S4 오해 리스크](#131-s3s4-오해-리스크)
  - [13.2 데이터 품질 리스크](#132-데이터-품질-리스크)
  - [13.3 제품 신뢰성 리스크](#133-제품-신뢰성-리스크)
  - [13.4 공유/보안 리스크](#134-공유보안-리스크)

  </details>

- [14. 핵심 의사결정 항목](#14-핵심-의사결정-항목)
- [15. 최종 요약](#15-최종-요약)

## 0. 규제 리스크

현재 Stage 1의 규제 리스크는 성능 수치 자체보다도, 제품을 무엇으로 정의하고 결과를 어떤 의미로 제시하는지에 의해 더 크게 좌우된다. 현재 문맥에서 핵심은 연구용 신호 분석 및 해석 지원 Tool 포지셔닝을 유지하면서, 향후 제품화 가능성과 연결될 수 있는 표현, 출력, 사용 시나리오를 선제적으로 통제하는 것이다.

| 리스크 항목 | 발생 조건 / 트리거 | 잠재 영향 | 현재 단계 대응 원칙 | 향후 보완 필요 사항 | 권장 Owner |
| --- | --- | --- | --- | --- | --- |
| 사용목적(Intended Use) 확장 리스크 | 연구용 분석 Tool로 정의된 제품이 문서, 발표, UI, README, 시연 과정에서<br>질환 판단, 이상 여부 평가, 스크리닝, 위험도 제시 등 의료적 목적을 암시하거나 명시하는 경우 | 제품의 규제 포지셔닝이 연구용 Tool에서<br>디지털의료기기 또는 독립형 디지털의료기기소프트웨어 방향으로 상향 해석될 수 있음 | 현재 공식 intended use를 연구용 신호 분석 및 해석 지원 Tool로 고정하고,<br>문서 간 표현을 일치시킴 | 버전별 intended use 문구 이력 관리,<br>대외 문서 검토 프로세스 도입 | Product Owner /<br>Regulatory Review Owner |
| 문서 간 표현 불일치 리스크 | PRD, 발표자료, README, UI 문구, export 컬럼명,<br>논문/포스터 초안에서 동일 기능을 서로 다르게 표현하는 경우 | 내부적으로는 연구용이라 주장하더라도 외부에서는<br>임상 판단 보조 또는 자동 판정 기능으로 해석될 수 있음 | 핵심 용어 사전을 운영하고,<br>`candidate`, `review`, `interpretation support` 등 허용 표현을 통일함 | 문서 릴리즈 전 표현 검토 체크리스트와<br>승인 절차 마련 | Product Owner /<br>Documentation Owner |
| 진단적 표현 사용 리스크 | `진단`, `확진`, `자동 판정`, `위험도`, `정상/비정상 분류`,<br>`의심 소견`, `스크리닝 결과` 등의 표현이 UI, 문서, 발표자료, export에 포함되는 경우 | 사용목적이 질병 판단과 직접 연결되어<br>규제 부담이 급격히 증가할 수 있음 | 현재 단계에서는 해당 표현을 사용하지 않고,<br>이벤트 검출, 파라미터 산출, 시각화, 탐색적 review, 후보 이벤트 제시로 제한함 | 금지 표현 목록과 허용 표현 목록을<br>별도 관리 | Product Owner /<br>UI Owner |
| S3/S4 오해 유발 리스크 | S3/S4 candidate를 확정 이벤트처럼 표시하거나,<br>병적 의미가 확정된 것처럼 설명하는 경우 | 사용자 또는 외부 검토자가 이를 임상적 결론으로 오해할 수 있으며,<br>제품 성격이 보수적으로 재해석될 수 있음 | S3/S4는 candidate overlay로만 표기하고,<br>confirmed structure와 시각적으로 명확히 구분함 | tooltip, legend, export 정책까지 포함한<br>오해 방지 설계 강화 | Algorithm Owner /<br>UI Owner / Clinical Reviewer |
| 파라미터의 임상 해석 직접 연결 리스크 | 계산된 parameter를 단순 수치가 아니라<br>환자 상태, 질환 가능성, 이상 여부와 직접 연결하는 설명을 제공하는 경우 | 단순 분석 기능이 아니라 의료적 판단 보조 기능으로<br>받아들여질 가능성이 높아짐 | 현재는 parameter를 cycle-centered review metric으로만 제시하고,<br>임상 결론 문구와 직접 연결하지 않음 | parameter별 intended meaning,<br>허용 해석 범위, 금지 해석 범위를 문서화 | Algorithm Owner /<br>Clinical Review Owner |
| 자동 판정 기능으로의 기능 확장 리스크 | 향후 모델 또는 rule-based 로직이 이상 여부, 질환 가능성,<br>경고 flag, 선별 결과를 자동 생성하는 경우 | 규제 대상성, 검증 요구, 성능 입증 부담,<br>사용적합성 요구 수준이 크게 상승할 수 있음 | 현재 단계에서는 자동 판정 기능을 비목표로 유지함 | Stage 2에서 intended use 재확정 후<br>별도 허가 전략 검토 | Product Owner /<br>Regulatory Review Owner |
| 의료진 판단 영향 리스크 | 제품 출력이 의료진의 진료 판단, 추가 검사 여부,<br>추적관찰 여부 등에 실질적으로 영향을 주는 방식으로 사용되는 경우 | 해석 지원 범위를 넘어 임상 판단 보조 소프트웨어로<br>분류 검토될 가능성이 커짐 | 현재는 내부 연구 검토용으로 사용 범위를 제한함 | 실제 사용 시나리오, 사용자, 사용 환경을<br>명확히 정의하고 문서화 | Product Owner /<br>Clinical Review Owner |
| 배포 범위 확대 리스크 | 연구실 내부 로컬 실행 Tool이 외부 기관, 병원,<br>다수 사용자 환경으로 반복 배포되는 경우 | 연구용 프로토타입이 아니라 제품 수준의 접근통제, 로그,<br>업데이트, 보안 관리가 요구될 수 있음 | 현재는 local-first 및 제한적 temporary share 구조로 운영하고,<br>제품 배포형으로 설명하지 않음 | 계정 체계, 권한 관리, 업데이트 정책,<br>배포 정책 수립 | Engineering Owner /<br>Security Owner |
| Export 결과의 오해 리스크 | export 파일의 sheet명, column명, flag명, 주석 등이<br>임상 판단 결과처럼 보이게 작성되는 경우 | UI보다 export 결과가 더 강한 판단 자료처럼 활용되어<br>규제 리스크가 커질 수 있음 | export는 cycle anchor 기반 parameter summary 중심으로 유지하고,<br>candidate 결과는 확정 지표처럼 보이지 않게 분리함 | export naming convention, 메타데이터 경고문,<br>버전 정보 포함 정책 수립 | Data Owner /<br>Product Owner |
| AI 기능 설명 부족 리스크 | AI 기반 S1/S2 추출과 rule-based 후처리, candidate detection,<br>parameter 산출이 문서상 명확히 구분되지 않는 경우 | 전체 제품이 불투명한 자동 판단 시스템처럼 보일 수 있고,<br>검증 및 심사 대응이 어려워질 수 있음 | AI 모델, rule-based 로직, 시각화 로직, export 로직을<br>분리 문서화함 | 기능별 입력/출력/실패 조건/검증 방법을<br>traceability 형태로 관리 | Algorithm Owner /<br>Validation Owner |
| 검증 부족 상태의 과대 주장 리스크 | 내부 pilot 수준 성능만으로 외부에 높은 정확도, 신뢰도,<br>임상 활용 가능성을 강조하는 경우 | 성능 claims가 실제 검증 수준을 초과하여<br>규제·신뢰성 리스크를 동시에 유발할 수 있음 | 현재는 내부 개발 게이트와 연구용 성능 기준으로만 표현하고,<br>임상적 효능 표현은 사용하지 않음 | claim 관리 문서, 성능 발표 승인 절차,<br>데이터셋 범위 명시 | Validation Owner /<br>Product Owner |
| 사용자 오사용 리스크 | 사용자가 candidate overlay, parameter card, graph annotation을<br>확정 판정 또는 질병 진단 결과로 받아들이는 경우 | 사용적합성 문제와 규제 해석 리스크가<br>동시에 발생할 수 있음 | candidate와 confirmed structure를 시각적으로 구분하고,<br>설명 문구를 명확히 제공함 | 주요 사용 오류 시나리오 정의,<br>사용적합성 평가 계획 수립 | UI Owner /<br>Usability Owner |
| 보안 및 접근통제 미흡 리스크 | temporary public share, lightweight gating, code mode 구조가<br>외부 사용까지 확장되는 경우 | 제품화 단계에서 요구될 수 있는 접근통제, audit,<br>보안 문서 요구에 대응하기 어려워짐 | 현재는 연구용 편의 기능으로 한정하여 설명하고,<br>제품 기본 구조로 간주하지 않음 | 제품화 단계에서 계정, 권한, 접근 로그,<br>보안 정책 재설계 | Security Owner /<br>Engineering Owner |
| 변경관리 미흡 리스크 | 알고리즘, UI, parameter formula, export 구조가 바뀌는데도<br>versioning과 change log가 충분히 관리되지 않는 경우 | 동일 제품으로 보기 어려워지고,<br>검증 결과와 실제 배포 버전 간 연결성이 약해짐 | 구현 spec, formula reference, PRD, validation record를<br>분리 관리함 | traceability table, release note, defect log,<br>재검증 기준 도입 | QA Owner /<br>Validation Owner |
| 규제 전략 지연 리스크 | 기능은 점점 확장되는데 intended use, 목표 사용자, 사용 환경,<br>허가 전략 검토가 뒤늦게 따라오는 경우 | 개발 방향과 규제 대응 방향이 어긋나<br>재작업 비용이 커질 수 있음 | 현재는 Stage 1 연구용 범위를 명확히 유지함 | Stage 2 진입 전에 규제 포지셔닝 사전 검토와<br>책임자 지정 필요 | Product Owner /<br>Regulatory Review Owner |

현재 단계에서 가장 우선적으로 통제해야 할 항목은 `사용목적(Intended Use) 확장`, `문서 간 표현 불일치`, `S3/S4 candidate의 확정 이벤트 오해`, `파라미터의 임상 해석 직접 연결`이다.

즉, 현재 프로젝트의 규제 대응 핵심은 성능 자체보다도 `무엇을 하는 제품으로 정의하는지`, `그 결과를 어떤 의미로 제시하는지`, `사용자가 그것을 어떻게 이해할 수 있는지`를 일관되게 통제하는 데 있다. Stage 1에서는 진단·확진·자동 판정 방향으로 읽힐 수 있는 표현과 사용 시나리오를 제한하고, candidate와 confirmed structure의 구분, parameter의 비진단적 제시, export naming의 보수적 관리가 우선되어야 한다. Stage 2/3로 확장할 경우에는 intended use 변경 이력, 표현 검토 절차, traceability, 사용적합성, 보안·변경관리 체계를 함께 보강해야 한다.

## 1. 문서 목적

본 문서는 HeartSound(PCG) 및 ECG 기반 신호 분석 Tool의 현재 구현 범위, 제품 목표, 기능 요구사항, 비기능 요구사항, 데이터 및 알고리즘 요구사항, 검증 방향, 그리고 향후 허가·규제 대응 방향을 일관된 구조로 정리하기 위한 PRD이다.

이 문서의 목적은 다음과 같다.

- 현재 연구용 내부 프로토타입의 기능 범위를 명확히 정의한다.
- 향후 상용화 버전에서 어떤 기능이 제품 핵심이 되는지 정리한다.
- 현재 구현 사실과 미래 확장 목표를 분리하여 기록한다.
- 향후 MFDS 인허가 가능성을 고려한 개발 산출물 관리 기준을 설정한다.
- 연구용 분석 Tool에서 해석 지원형 소프트웨어로 발전하기 위한 요구사항을 구조화한다.

**핵심**: 이 문서는 `현재 구현된 것`과 `향후 목표 제품`을 명확히 구분하는 것을 가장 중요한 원칙으로 삼는다.

## 2. 제품 개요

### 2.1 제품 요약

본 제품은 HeartSound(PCG) 및 ECG 신호를 업로드하고, panel 단위로 파일을 연결하여, waveform 시각화, cycle 기반 이벤트 검토, 파라미터 계산, audio playback, 비교 분석, xlsx export를 수행할 수 있는 연구용 신호 분석 소프트웨어이다.

현재 제품은 다음 성격을 가진다.

- HeartSound 및 ECG workspace를 지원하는 브라우저 기반 분석 환경
- S1/S2 중심 cycle 구조화 및 parameter review 중심 Tool
- S3/S4는 확정 진단이 아닌 candidate overlay로 제공
- waveform, parameter, audio playback, cycle navigation이 연결된 review workflow 제공
- local-first 실행 구조와 임시 공유 구조를 모두 포함한 내부 검토용 Tool

### 2.2 해결하려는 문제

기존 심음 분석 환경에서는 다음과 같은 문제가 존재한다.

- 신호를 눈으로 보는 것과 이벤트 구조를 체계적으로 검토하는 것이 분리되어 있다.
- S1/S2 event, cycle, parameter, audio review가 하나의 일관된 workflow로 연결되지 않는 경우가 많다.
- S3/S4와 같은 추가 심음은 노이즈와 구조적 모호성 때문에 탐색적으로 검토하기 어렵다.
- 연구 단계에서는 알고리즘 검증, 시각화, 데이터 비교, export가 하나의 Tool 안에서 반복적으로 이뤄져야 한다.

본 제품은 이러한 문제를 해결하기 위해, `signal visualization + event structuring + cycle-centered parameter interpretation + audio-synchronized review`를 하나의 분석 환경으로 제공한다.

### 2.3 제품 비전

단기적으로는 연구실 내부에서 HeartSound/ECG 분석 구조를 안정화하고,  
중기적으로는 AI 기반 이벤트 검출과 parameter interpretation workflow를 정교화하며,  
장기적으로는 의료전문가의 해석을 지원하는 소프트웨어로 확장하는 것을 목표로 한다.

### 2.4 현재 공개적으로 확인 가능한 심음 분석 소프트웨어 정리

아래 내용은 현재 공개적으로 확인 가능한 범위에서 심음(PCG) 분석, segmentation, 판독 보조, 분류, 시각화 기능이 명시된 소프트웨어와 플랫폼을 정리한 것이다.  
단순 녹음 앱은 제외했으며, 공개 사이트·앱·FDA 문서·저장소·임상시험 등록 등 원자료에서 확인 가능한 수준만 반영했다.

#### 1. 상용 또는 실제 배포 중인 소프트웨어/플랫폼

| 이름 | 범주 또는 상태 | 심음 분석 범위 또는 핵심 기능 | 입력/하드웨어 또는 형태 | 현재 확인 상태 | 근거 |
| --- | --- | --- | --- | --- | --- |
| Eko App / Eko Analysis Software (EAS) / EMAS / EFAST | 임상 상용 | 심잡음 탐지, brady/tachy 확인, ECG+PCG 동기화 분석, AI 판독 보조 | Eko/Littmann CORE 호환 디지털 청진기 | 공식 앱·공식 사이트·FDA 문서로 현재 운영 확인 | [공식 사이트](https://www.ekohealth.com/), [앱](https://play.google.com/store/apps/details?hl=en_SG&id=com.ekodevices.android), [FDA K192004](https://www.accessdata.fda.gov/CDRH510K/K192004.pdf), [FDA K251494](https://www.accessdata.fda.gov/cdrh_docs/pdf25/K251494.pdf) |
| eMurmur / eMurmur Heart AI | 임상 상용 | S1/S2, 생리적/병적 murmur, murmur 부재/존재 식별, 정량적 auscultation 분석 | 전자청진기 입력, 웹/모바일/제3자 소프트웨어 연동 | 공식 사이트상 FDA cleared/CE marked, eMurmur Heart AI 관련 공개 자료 확인 | [공식 사이트](https://emurmur.com/), [AI 소개](https://emurmur.com/ai-publications/), [FDA K181988](https://www.accessdata.fda.gov/cdrh_docs/pdf18/K181988.pdf), [FDA K220766](https://www.accessdata.fda.gov/cdrh_docs/pdf22/K220766.pdf) |
| Stethophone / Stethophone Pro | 임상·소비자 겸용 앱형 SaMD | 심잡음 탐지, S1/S2 검출, timing interval 계산, 시각화, segmentation, recording quality 확인 | 스마트폰 마이크 기반 수집 | 공식 사이트와 FDA 문서로 제품·분석 기능 공개 확인 | [공식 사이트](https://stethophone.com/), [제품 안내](https://stethophone.com/ca/en/product/), [FDA K240901](https://www.accessdata.fda.gov/cdrh_docs/pdf24/K240901.pdf) |
| Cardio-HART (Cardio-Phoenix) | 멀티모달 심장진단 플랫폼 | ECG+PCG+MCG 동기화 AI 분석, valve disease/HF 등 구조적 이상 평가 보조 | 전용 장비 | 공식 사이트와 제품 설명 페이지에서 운영·임상 활용 축 확인 | [공식 사이트](https://cardiophoenix.com/), [제품 설명](https://cardiophoenix.com/how-cardio-hart-works/) |
| VoqX (Sanolla) | 상용 청진 플랫폼 | 실시간 AI heart/lung sound analysis, 저주파·infrasound 포함 | VoqX smart stethoscope | 공식 사이트와 공식 보도자료에서 판매·제품 기능 공개 확인 | [공식 사이트](https://sanolla.com/), [제품 페이지](https://sanolla.com/smart-stethoscope/), [보도자료](https://sanolla.com/press-release/sanolla-launches-the-worlds-first-smart-ai-powered-stethoscope-offering-full-spectrum-auscultation/) |
| Skeeper AI ecosystem (smartsound) | 상용 청진 플랫폼 | on-device/스마트폰 Edge AI 기반 heart/lung sound analysis 및 분류 | R1/H1/P1/SM-300 등 자사 기기 + 앱/소프트웨어 | 공식 사이트에서 제품군·AI 분석·서비스 개요 공개 확인 | [공식 사이트](https://ismartsound.com/), [Skeeper AI](https://ismartsound.com/solutions/skeeper-ai/), [개요](https://ismartsound.com/company/overview/) |
| AI Body Sound | 소비자/가정용 | 정상/비정상 심음 판정, arrhythmia 가능성, 차트/히스토리 관리 | 전용 Body Sound 장치 | 공식 사이트에서 제품·기능 페이지 공개 확인 | [공식 사이트](https://www.aibodysound.com/), [영문 페이지](https://www.aibodysound.com/?locale=en&phpinfo=1) |

#### 2. 연구용·오픈소스 소프트웨어

| 이름 | 범주 또는 상태 | 심음 분석 범위 또는 핵심 기능 | 입력/하드웨어 또는 형태 | 현재 확인 상태 | 근거 |
| --- | --- | --- | --- | --- | --- |
| pyPCG | 연구용 툴박스 | I/O, SQI, denoising, filtering, envelope, peak detection, segmentation, feature extraction, statistics, visualization | Python toolbox / docs / repo | 문서와 공개 저장소 확인 | [Docs](https://pypcg-toolbox.readthedocs.io/en/latest), [GitHub](https://github.com/mulkr/pyPCG-toolbox/) |
| Listen2YourHeart | 연구용 프레임워크 | PCG classification용 contrastive SSL 학습 프레임워크 | GitHub 공개 프레임워크 | 공개 저장소 확인 | [GitHub](https://github.com/aristotelisballas/listen2yourheart) |
| PCG_FTSeg | 연구용 구현체 | CNN + Fourier transform 기반 PCG segmentation | GitHub 공식 코드 | 공식 구현 저장소 공개 확인 | [GitHub](https://github.com/brody9512/PCG_FTSeg) |
| phonocardiogram-heart-sound-analysis | 연구용 구현체 | EMD + Higher-Order Spectra 기반 S1/S2 중심 heart sound analysis | GitHub 공식 코드 | 공식 구현 저장소 확인 | [GitHub](https://github.com/sfoteini/phonocardiogram-heart-sound-analysis) |
| DeepPSP/cinc2022 | 챌린지용 연구 코드 | PhysioNet 2022용 heart murmur detection 파이프라인 | GitHub 공개 코드 | 공개 저장소 확인 | [GitHub](https://github.com/DeepPSP/cinc2022) |

#### 3. 존재는 확인되지만 공개 상용 배포 상태가 불명확하거나 임상평가 성격이 강한 것

| 이름 | 범주 또는 상태 | 심음 분석 범위 또는 핵심 기능 | 입력/하드웨어 또는 형태 | 현재 확인 상태 | 근거 |
| --- | --- | --- | --- | --- | --- |
| FonoCheck | 연구/임상평가 단계 | 스마트폰 앱 심음 측정, 의사용 웹사이트 연동 형태 소개 | 스마트폰 앱 + 의사용 웹 포털 | NWO 프로젝트 페이지 기준 공개 확인, 공개 상용 배포 상태는 불명 | [NWO](https://www.nwo.nl/en/projects/21431) |
| ausculto | 임상시험 단계 | 실시간 heart murmur detection용 경량 알고리즘 | 스마트폰 내장 마이크 기반 알고리즘 | ClinicalTrials 등록 확인 | [ClinicalTrials](https://clinicaltrials.gov/study/NCT06070298) |
| Zargis Cardioscan | 역사적 상용/현행 불명 | electronic auscultatory device 기반 heart sound analysis support | 전자 청진 기반 장치/소프트웨어 | 과거 FDA 510(k) 자료 확인, 현행 독립 사업 지속성은 공개 확인 어려움 | [FDA PMN](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K042128), [FDA PDF](https://www.accessdata.fda.gov/cdrh_docs/pdf4/K042128.pdf) |

현재 공개적으로 확인 가능한 범위에서 보면, 임상 상용 제품군은 디지털 청진기 연동, murmur detection, S1/S2 분석, ECG+PCG 동기화, AI 판독 보조까지 포함하는 방향으로 구성되어 있다.  
연구용·오픈소스 소프트웨어는 segmentation, feature extraction, murmur detection, SSL classification 등 알고리즘 연구와 재현 가능한 구현에 초점이 맞춰져 있다.  
한편 일부 항목은 존재 자체는 공개적으로 확인되지만, 공개 상용 배포 상태가 불명확하거나 임상평가·시험 단계 성격이 더 강하게 보인다.  
따라서 실제 제품 조사나 경쟁 구도 정리에서는 상용 운영 확인 여부, 연구 코드 공개 여부, 평가 단계 여부를 구분해서 보는 것이 적절하다.

## 3. 현재 제품 정의와 향후 제품 정의

### 3.1 현재 제품 정의

현재 버전의 공식 제품 정의는 다음과 같다.

> 본 소프트웨어는 HeartSound(PCG) 및 ECG 신호 데이터를 시각화하고,  
> S1/S2 중심 이벤트 구조 및 cycle 기반 parameter를 계산·표시하여  
> 연구자 또는 의료전문가가 신호를 검토하도록 지원하는 연구용 분석 소프트웨어이다.  
> 본 버전은 질병의 진단, 확진, 치료 결정 또는 자동 스크리닝 결과 제시를 목적으로 하지 않는다.

**핵심**:

- 현재 버전은 연구용 신호 분석 및 해석 지원 Tool로 정의한다.
- 현재 단계에서는 진단, 확진, 자동 판정, 위험도 제시 표현을 사용하지 않는다.

### 3.2 향후 제품 정의 후보

향후 제품화 버전의 정의는 두 단계로 나누어 검토한다.

#### 후보안 A: 해석 지원형

> 본 소프트웨어는 PCG 및 ECG 신호에서 심음 이벤트와 관련 파라미터를 분석하여  
> 의료전문가의 해석을 지원하는 소프트웨어이다.

#### 후보안 B: 선별 평가 지원형

> 본 소프트웨어는 PCG 및 ECG 신호에서 심음 이벤트와 이상 징후 관련 지표를 분석하여  
> 의료전문가의 선별 평가를 지원하는 소프트웨어이다.

**핵심**:

- A안은 상대적으로 보수적인 표현이다.
- B안은 규제 부담이 더 높아질 가능성이 있다.

**보완 필요**: 최종 intended use는 제품화 이전에 별도 의사결정 문서로 고정해야 한다.

## 4. 대상 사용자 및 사용 환경

### 4.1 1차 사용자

- 연구자
- 알고리즘 개발자
- biomedical signal 분석 담당자
- 내부 검토 참여 의료전문가

### 4.2 2차 사용자

- 제품화 이후의 의료전문가
- 병원 또는 임상 연구 환경 사용자
- 후향 데이터 분석 또는 스크리닝 해석 지원 사용자

### 4.3 현재 사용 환경

- 연구실 내부
- 로컬 실행 환경
- 내부 데이터 검토 및 알고리즘 구조화
- temporary share를 통한 제한적 외부 검토

### 4.4 향후 사용 환경

- 의료기관 또는 임상 연구 환경
- 사용자 권한이 분리된 배포 구조
- 장기적으로는 독립 실행형 소프트웨어 사용 시나리오

**보완 필요**: 현재 PRD에는 `누가 최종 의사결정권자인지`가 더 분명히 들어가야 한다.  
예: 최종 해석 주체는 의료전문가, 연구 단계에서는 연구책임자 검토 하 사용 등.

## 5. 제품 목표와 비목표

### 5.1 현재 단계 목표

- HeartSound/ECG signal review workflow를 일관되게 정리한다.
- S1/S2 event structure와 cycle construction 로직을 안정화한다.
- AI 기반 S1/S2 추출과 rule-based parameter pipeline을 연결한다.
- S3/S4 candidate를 탐색적 review layer로 제공한다.
- waveform, cycle, parameter, audio, export를 하나의 인터페이스로 통합한다.

### 5.2 향후 단계 목표

- AI 기반 이벤트 검출 성능을 정량화하고 버전별로 관리한다.
- S3/S4 candidate를 더 정교한 feature 또는 검증 가능한 보조 지표로 발전시킨다.
- 의료전문가가 임상 해석에 참고할 수 있는 수준의 인터페이스와 설명성을 확보한다.
- 규제 대응이 가능한 문서화, 검증, 품질관리 체계를 구축한다.

### 5.3 현재 단계 비목표

- 질환 확진
- 자동 진단
- 치료 방침 결정
- 환자 위험도 최종 판정
- 임상적 결론 자동 생성
- 영구 클라우드 운영형 multi-tenant 서비스

## 6. 현재 구현 범위

### 6.1 실행 및 접근 구조

현재 Tool은 local-first runtime model을 따른다.

- `./bin/start`, `./bin/stop_dev.sh`, `./bin/share`, `./bin/stop_share.sh`를 주요 운영 진입점으로 사용
- frontend / backend / launcher 기반 실행 구조
- cloudflared 기반 임시 public sharing 지원
- `open` 및 `code` access mode 지원
- `.launcher/logs` 기반 운영 log 확인 가능

이 구조는 연구실 내부 데모, 반복 실험, 공유 테스트에 적합하도록 설계되어 있으며, 현재는 permanent cloud hosting이나 강한 identity management를 목표로 하지 않는다.

### 6.2 파일 관리 구조

현재 제품은 파일을 역할(role) 기준으로 관리한다.

- Data
- Wave
- Parameter
- Unsupervised

주요 특징은 다음과 같다.

- 파일은 workspace-aware하게 관리된다.
- 파일은 global activation이 아니라 panel-linked 방식으로 연결된다.
- tabular input은 `.csv`, `.xlsx`, wave는 `.wav`를 사용한다.
- auto-linking은 filename normalization과 sync key 기반으로 동작한다.
- file registry는 fileId, original name, stored name, role, extension, row count, timestamp 등을 관리한다.

### 6.3 Panel 및 Layout 구조

현재 제품은 left sidebar + right analysis area 구조를 가진다.

- 1 Panel
- 2 Panels

각 panel은 독립된 review context를 가진다.

- primary data file
- linked wave file
- linked parameter source
- linked unsupervised file
- graph range
- selected cycle
- selected parameter metric

panel header에는 다음이 포함된다.

- linked file 정보
- Default
- Detail
- parameter toggle
- settings
- reset
- wave playback controls

### 6.4 Graph 및 Visualization 구조

HeartSound graph는 다음 요소를 중심으로 구성된다.

- amplitude waveform
- RS-score 기반 overlay
- S1 area / S2 area
- cycle highlight
- parameter-linked annotation
- playback-linked playhead
- S3/S4 candidate overlay

기본 visible layer는 clutter를 줄이는 방향으로 설정되며, 추가 layer는 Detail modal을 통해 on/off된다.

### 6.5 HeartSound Cycle 및 S1/S2 구조

현재 HeartSound cycle backbone은 다음 원리로 구성된다.

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

현재 cycle validity rule은 다음과 같다.

> `S1 start < S1 end < S2 start < S2 end < next S1 start`

현재 cycle은 `current S1 start -> next S1 start` 기준으로 정의되며, 이는 cycle navigation, parameter grouping, HR calculation, graph highlight의 anchor가 된다.

### 6.6 S3 / S4 candidate 구조

현재 S3/S4는 확정 event가 아니라 candidate layer이다.

- S3: S2 직후의 early diastolic candidate
- S4: 다음 S1 직전의 late diastolic candidate

이 candidate는 cycle-aware window 안에서 amplitude behavior 중심으로 탐색된다. 현재는 pathology-grade label이 아니며, 시각적 탐색과 추가 검토를 위한 보조 정보로 사용된다.

### 6.7 Wave playback 구조

Wave playback은 panel-linked resource로 동작한다.

- play / pause
- ±5 sec jump
- reset to 0
- slow playback
- draggable playhead
- graph viewport synchronization

즉, audio playback은 단순 media 기능이 아니라 waveform review와 연결된 synchronized inspection 기능이다.

### 6.8 Parameter window 및 interaction

Parameter window는 graph 아래에 위치하며 cycle-centered summary 역할을 한다.

- cycle navigation
- current cycle range 표시
- HR 표시
- clickable parameter card
- hover explanation
- graph-linked annotation
- Download xlsx

### 6.9 현재 HeartSound parameter set

현재 top-level parameter family는 다음과 같다.

- S1
- S2
- S1-S2
- RS Score
- HR

대표 항목:

- S1 Duration, S1 Peak, S1 Mean, S1 RMS, S1 Area
- S2 Duration, S2 Peak, S2 Mean, S2 RMS, S2 Area
- S1-S2 Duration, S1-S2 Energy, S2-S1 Duration, S2-S1 Energy
- S1_s RS Peak, S1_e RS Peak, S2_s RS Peak, S1_s RS Width, S2_e RS Width
- HR

### 6.10 Parameter computation rule

현재 parameter system은 다음 공통 규칙을 따른다.

- sample rate = `4000 Hz`
- `1 sample = 0.25 ms`
- amplitude unit = `mV`
- half-open interval `[start, end)` 사용
- invalid case는 `0`이 아니라 `NaN` 사용
- 대부분의 metric은 cycle-local metric
- RS Width는 selected peak 주변 half-height local spread 기준

### 6.11 Export 및 documentation 구조

현재 export는 HeartSound parameter workbook을 생성한다.

- Parameters sheet
- Metadata sheet

또한 문서 구조는 다음 계층으로 관리된다.

- `process/current_implementation_spec.md`
- `product_requirements_document.md`
- `process/heartsound_parameter_formula_reference.md`
- `ideas/` 폴더 내 concept 및 planning 문서

## 7. 핵심 제품 요구사항

아래 요구사항은 현재 구현을 반영하면서 향후 제품화를 염두에 둔 형태로 정리한다.

### FR-01. Workspace 및 파일 입력

제품은 HeartSound와 ECG workspace를 지원해야 한다.  
사용자는 Data, Wave, Parameter, Unsupervised role에 따라 파일을 업로드하고 관리할 수 있어야 한다.

### FR-02. Panel-linked review context

제품은 panel 단위로 review context를 유지해야 한다.  
각 panel은 독립된 file binding, graph range, selected cycle, selected parameter state를 가져야 한다.

### FR-03. One-panel / two-panel 비교

제품은 single-panel focused review와 two-panel comparison을 모두 지원해야 한다.  
두 panel은 서로 자동으로 state를 공유하지 않아야 하며, side-by-side comparison이 가능해야 한다.

### FR-04. Graph visibility control

제품은 기본 graph state에서 clutter를 최소화해야 하며, Detail modal을 통해 추가 overlay를 제어할 수 있어야 한다.

### FR-05. S1/S2 event structuring

제품은 RS-score 기반 boundary signal을 사용하여 S1/S2 region을 구성해야 한다.  
invalid interval 또는 malformed cycle은 분석 대상에서 제외되어야 한다.

### FR-06. Cycle-aware navigation

제품은 cycle stepper 및 keyboard shortcut을 통해 cycle별 탐색을 지원해야 한다.  
선택된 cycle이 visible range 밖에 있으면 viewport를 적절히 이동해야 한다.

### FR-07. S3/S4 candidate support

제품은 S3/S4를 definitive label이 아닌 candidate overlay로 제공해야 한다.  
candidate는 cycle-aware timing window 안에서 탐색되어야 하며, primary sound structure와 시각적으로 구분되어야 한다.

### FR-08. Parameter-to-graph explainability

제품은 parameter card 클릭 시 해당 metric이 waveform의 어느 구간에서 계산되었는지 annotation으로 보여줘야 한다.  
사용자는 value와 source interval을 직관적으로 연결할 수 있어야 한다.

### FR-09. Audio-synchronized review

제품은 linked wave를 panel에 연결하고, playback position과 graph playhead를 동기화해야 한다.  
사용자는 waveform context에서 직접 scrub 및 반복 검토를 수행할 수 있어야 한다.

### FR-10. Export

제품은 valid cycle 기반의 parameter row를 xlsx 형식으로 export할 수 있어야 한다.  
export는 UI에서 보는 cycle anchor와 동일한 구조를 반영해야 한다.

### FR-11. Runtime observability

제품은 실행 상태, log, share 상태를 운영적으로 확인할 수 있어야 한다.  
launch, share, backend, frontend 상태는 추적 가능해야 한다.

### FR-12. Documentation continuity

제품은 구현 spec, formula reference, planning concept 문서를 분리 관리해야 한다.  
개발자는 제품 동작, formula, future concept를 서로 다른 계층에서 추적 가능해야 한다.

## 8. 데이터, 알고리즘, 검증 요구사항

### 8.1 데이터 요구사항

제품은 다음 입력 데이터를 지원해야 한다.

- HeartSound amplitude 및 RS-score column이 포함된 tabular data
- ECG raw signal 및 marker channel
- panel-linked `.wav`
- optional parameter / unsupervised auxiliary input

### 8.2 알고리즘 역할 분리

제품의 로직은 다음 단위로 분리 문서화되어야 한다.

- S1/S2 event extraction
  - 현재 방향: AI 기반 event point extraction
- Cycle construction
  - start/end RS-score pairing 및 validity filtering
- S3/S4 candidate detection
  - cycle-aware, amplitude-driven rule-based candidate detection
- Parameter computation
  - cycle-local metric calculation
- UI interpretation flow
  - graph, panel, playback, parameter interaction

**핵심**:

- AI와 rule-based 로직은 문서상 반드시 분리되어야 한다.
- 입력, 출력, 실패 조건, 검증 방법을 기능 단위로 따로 기록해야 한다.

### 8.3 최소 검증 endpoint

현재 및 향후 검증은 최소한 다음 항목을 포함해야 한다.

- S1/S2 event detection accuracy
- event timing error
- valid cycle formation rate
- parameter recomputation consistency
- data version별 성능 변화
- S3/S4 candidate reviewer agreement
- UI 오해 가능성 및 사용 오류 사례

### 8.4 권장 내부 성능 게이트(초안)

아래 수치는 규제 기준이 아니라 내부 개발 게이트 제안값이다.

- S1/S2 event detection: held-out internal set 기준 `F1 >= 0.90` 목표
- event timing error: 평균 절대오차 `25 ms 이하` 목표
- valid cycle formation success: analyzable recording 기준 `95% 이상` 목표
- parameter determinism: 동일 입력/동일 버전에서 `100% 동일 출력`
- export consistency: UI 기반 cycle anchor와 export row의 구조적 불일치 `0건`
- S3/S4 candidate: pilot expert review agreement metric 정의 후 추적

**보완 필요**:

- 위 수치는 팀 내부 기준으로 확정해야 한다.
- S3/S4는 아직 candidate 단계이므로 최종 임상 지표보다 reviewer agreement 중심으로 출발하는 것이 적절하다.

## 9. 비기능 요구사항

### 9.1 재현성

동일한 입력 파일, 동일한 버전, 동일한 설정에서는 동일한 cycle/parameter/export 결과가 재현되어야 한다.

### 9.2 해석 가능성

사용자는 graph, cycle, parameter, playback이 서로 어떻게 연결되는지 이해할 수 있어야 한다.  
candidate event와 confirmed structure는 시각적으로 혼동되지 않아야 한다.

### 9.3 안정성

invalid cycle, missing anchor, malformed interval이 있을 경우 시스템은 임의 값을 생성하지 않고 `NaN` 또는 명시적 제외 정책을 사용해야 한다.

### 9.4 운영 관측성

backend/frontend/share 상태와 log가 분리 관리되어야 하며, 연구 환경에서 오류 원인을 추적할 수 있어야 한다.

### 9.5 접근 통제

현재는 `open / code mode` 수준의 lightweight gating을 사용하지만, 향후 제품화 단계에서는 계정, 권한, 로그, 배포, 업데이트 체계가 강화되어야 한다.

### 9.6 문서화

요구사항, 구현 spec, formula reference, change log, validation record가 버전 기준으로 관리되어야 한다.

### 9.7 사용적합성

사용자는 candidate overlay를 확정 판정으로 오해하지 않아야 한다.  
cycle navigation, parameter click, playback control 등 주요 interaction은 오류 없이 이해 가능해야 한다.

## 10. 규제 및 허가 대응 방향

국내에서는 `디지털의료제품법`이 `2025년 1월 24일`부터 시행 중이며, 같은 법 체계는 디지털의료기기, 디지털의료·건강지원기기, 디지털의료기기소프트웨어를 구분한다. 법령상 질병의 진단·치료·예후 관찰 목적의 제품은 디지털의료기기 범주와 연결될 수 있고, 디지털의료기기에 해당하지 않더라도 생체신호를 모니터링·측정·수집·분석해 의료 지원 또는 건강 유지·향상에 사용하는 제품은 디지털의료·건강지원기기 범주와 연결될 수 있다. 시행령 역시 `2025년 1월 24일`부터 시행되었다.

또한 식약처는 디지털의료제품 분류 및 등급 지정 관련 규정과 함께, 디지털의료기기소프트웨어 허가·심사, 독립형 디지털의료기기소프트웨어 사용적합성, 의료기기 사이버보안, AI 적용 디지털의료기기 임상시험방법, 디지털의료기기 제조 및 품질관리기준, 디지털의료건강지원기기 성능인증과 관련한 가이드라인을 순차적으로 제시하고 있다.

### 10.1 현재 규제 포지셔닝

현재 제품은 연구용 내부 프로토타입으로 포지셔닝한다.

- 신호 구조화
- 이벤트 검토
- parameter 산출 및 시각화
- candidate review
- 연구실 내부 검증

현재 단계에서는 의료기기 허가 대상 제품으로 단정하지 않는다.

### 10.2 향후 규제 포지셔닝 가정

다음 기능이 포함되면 독립형 디지털의료기기소프트웨어 해당 가능성을 보수적으로 검토한다.

- 질환 가능성, 이상 여부, 위험도, 스크리닝 결과 제시
- S3/S4 또는 파라미터 결과를 환자 상태 판단과 직접 연결
- 의료진의 진료 판단 보조 목적 사용
- 임상적 결론 도출에 영향을 주는 형태의 출력

**핵심**:

- 규제 포지셔닝은 기술 스택보다 사용목적 문구에 의해 크게 좌우된다.
- 현재는 연구용 Tool, 향후는 해석 지원형 소프트웨어로 분리 서술해야 한다.

**보완 필요**: intended use 후보안 A/B를 내부 승인 문서로 확정해야 한다.

### 10.3 현재 PRD에서 금지하거나 주의할 표현

- 진단
- 확진
- 자동 판정
- 환자 위험도 제시
- 임상 결론 자동 생성

### 10.4 현재 PRD에서 권장하는 표현

- 이벤트 검출
- 파라미터 산출
- 시각화
- 해석 지원
- 후보 이벤트 제시
- 탐색적 review
- 의료전문가의 판단 지원 가능성

### 10.5 제품코드 및 등급 원칙

현 시점에서 제품코드, 등급, 허가·인증·신고 경로를 PRD에 확정값으로 쓰지 않는다.  
최종 경로는 확정된 intended use, 기능 범위, 의료적 영향, 사용자, 사용 환경, 배포 구조를 기준으로 판단한다.

## 11. 허가 대비 준비 산출물

향후 허가 대상 제품으로 확장될 가능성을 고려하면, 개발 단계부터 아래 산출물을 누적 관리해야 한다.

### 11.1 Intended use 관리

- 현재 intended use 문구
- 미래 intended use 후보
- 버전별 문구 변경 이력
- 발표 자료/PRD/README 간 일치 여부

### 11.2 데이터 및 라벨 관리

- 데이터 출처
- 라벨 정의
- 제외 기준
- 전처리 방식
- 학습 / 검증 / 시험 분리 기준
- dataset version

### 11.3 알고리즘 검증 문서

- S1/S2 검출 모델 설명
- S3/S4 candidate rule 설명
- parameter computation rule
- 입력/출력/실패 조건
- 버전별 성능 비교

### 11.4 UI / 사용적합성 문서

- candidate와 confirmed structure의 시각 구분 근거
- 사용자가 헷갈릴 수 있는 표현 목록
- 잘못된 사용 시나리오
- 주요 UI task와 예상 오류

### 11.5 보안 및 운영 문서

- access control 구조
- share 구조
- log 및 audit trail 정책
- 업데이트 방식
- 데이터 저장 위치와 삭제 정책

### 11.6 품질 및 변경관리 문서

- 요구사항 문서
- 검증 결과
- 릴리즈 노트
- defect log
- 수정 이력
- traceability table

**핵심**:

- 성능지표만 쌓아서는 부족하다.
- 사용적합성, 사이버보안, 품질문서화, 변경관리까지 함께 가야 한다.

**보완 필요**: 각 산출물의 owner와 업데이트 주기를 정해야 한다.

## 12. 단계별 개발 및 규제 로드맵

### Stage 1. 연구용 프로토타입

목표:

- 내부 데이터 기반 구조 검증
- S1/S2 cycle backbone 안정화
- S3/S4 candidate visual review 정리
- waveform / parameter / playback / export workflow 정리

종료 기준(권장 초안):

- S1/S2 검출 성능 내부 기준 충족
- valid cycle 생성 안정성 확보
- export consistency 확인
- candidate vs confirmed visual distinction 검토 완료

### Stage 2. 제품화 가능성 검토

목표:

- intended use 확정 후보 도출
- 목표 사용자와 사용 환경 확정
- validation protocol 정비
- 규제 분류 사전 검토

종료 기준(권장 초안):

- target use case 승인
- 데이터셋 및 검증계획 문서화
- UI/UX 사용오류 시나리오 정리
- 보안/로그/배포 구조의 제품화 갭 분석 완료

### Stage 3. 허가 준비

목표:

- 제품코드/등급 분류 검토
- 기술문서, 검증자료, 사용적합성 자료 정비
- 품질관리체계 정비
- 필요 시 임상평가 또는 임상시험 전략 수립

**핵심**: 현재 프로젝트는 명확히 `Stage 1`이다.

**보완 필요**: Stage 1 -> Stage 2 전환 기준을 수치와 책임자 기준으로 더 명확히 고정해야 한다.

## 13. 주요 리스크와 대응 방향

### 13.1 S3/S4 오해 리스크

candidate overlay가 확정 이벤트처럼 오해될 수 있다.

대응:

- 시각적 구분 강화
- tooltip / 설명 문구 명확화
- export 기본 세트에서 분리 유지

### 13.2 데이터 품질 리스크

신호 품질 저하, 라벨 편차, 데이터셋 편향이 성능을 왜곡할 수 있다.

대응:

- dataset versioning
- labeling guideline 정리
- split 기준 및 excluded case 기록

### 13.3 제품 신뢰성 리스크

cycle anchor 불안정 시 downstream metric 전반이 무너질 수 있다.

대응:

- valid cycle rule 엄격 적용
- malformed cycle 제외 정책 유지
- anchor consistency test 자동화

### 13.4 공유/보안 리스크

temporary public share, code mode, local runtime 구조는 연구용에는 편리하지만 향후 제품 배포에는 취약할 수 있다.

대응:

- 제품화 단계에서 별도 계정/권한 체계 도입
- 원격 공유 구조 재설계
- access log 및 audit 강화

## 14. 핵심 의사결정 항목

다음 항목은 PRD 이후 빠르게 확정해야 한다.

- 현재 공식 intended use 문구
- 향후 intended use 후보안 A/B 중 우선안
- 최종 목표 사용자 정의
- S3/S4 검증 endpoint
- Stage 1 종료 기준
- data governance owner
- validation owner
- regulatory review owner

**핵심**: 이 8개가 정리되지 않으면 PRD는 문서로는 완성돼도 실행력이 약하다.

## 15. 최종 요약

본 제품은 현재 HeartSound/ECG 신호를 구조화하고, S1/S2 중심 cycle과 parameter를 검토하며, S3/S4를 candidate로 탐색할 수 있는 연구용 분석 소프트웨어이다. 현재 단계의 핵심 가치는 신호 시각화, event structuring, cycle-centered parameter interpretation, audio-synchronized review, export 기반 연구 workflow 통합에 있다.

향후 제품화 버전은 AI 기반 S1/S2 이벤트 추출, algorithm 기반 S3/S4 candidate 탐지, 이벤트별 parameter 분석을 바탕으로 의료전문가의 해석을 지원하는 소프트웨어로 확장될 수 있다. 다만 이 확장 범위가 스크리닝, 위험도 제시, 임상 판단 보조로 이어질 경우 국내 디지털의료제품법 체계상 디지털의료기기 또는 독립형 디지털의료기기소프트웨어 해당 가능성을 보수적으로 검토해야 한다. 따라서 본 PRD는 현재 제품을 연구용 Tool로 정의하되, 향후 허가 대응을 고려한 데이터 관리, 검증, 사용적합성, 보안, 품질문서화 체계를 미리 준비하는 방향을 채택한다.
