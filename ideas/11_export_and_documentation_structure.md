# Export 및 Documentation 구조

## 목적

이 문서는 현재 Tool이 계산된 정보를 어떻게 외부로 내보내는지, 그리고 프로젝트 지식이 repository 내부에서 어떻게 문서화되고 있는지를 설명한다.

이 카테고리는 직접적인 interactive analysis보다는, 결과의 지속성(persistence)과 전달(communication)에 관한 내용이다.

## 범위

이 카테고리에서 다루는 내용은 다음과 같다.

- parameter xlsx export
- export content 구조
- metadata sheet 동작
- implementation document
- PRD 수준 문서
- parameter formula reference
- `ideas` 폴더의 역할

이 카테고리에서 다루지 않는 내용은 다음과 같다.

- runtime 동작
- graph rendering logic
- file upload 내부 구조

## Export 철학

현재 Tool은 화면 위 분석에서 끝나지 않는다.  
사용자가 계산된 HeartSound parameter를 workbook 형태로 추출할 수 있도록 지원한다.

이것이 중요한 이유는 많은 연구 workflow가 다음을 필요로 하기 때문이다.

- offline review
- 앱 외부에서의 비교
- record keeping
- spreadsheet 기반 분석

## 현재 Parameter Export

parameter window에는 `Download xlsx` action이 포함되어 있다.

HeartSound data의 경우, 이 export에는 다음이 포함된다.

- cycle 단위로 계산된 derived parameter row
- export source에 대한 metadata

즉, 이 export는 단순한 UI 화면 캡처가 아니라, 현재 derived analysis를 구조화된 형태로 표현한 결과물이다.

## Workbook 구조

현재 workbook에는 최소한 다음 sheet가 포함된다.

- `Parameters` sheet
- `Metadata` sheet

### `Parameters` Sheet

이 sheet에는 다음이 포함된다.

- valid cycle당 1개 row
- start/end position과 같은 structural anchor
- S1, S2, relation gap, RS score, HR에 대한 derived metric

### `Metadata` Sheet

이 sheet는 export context를 기록한다. 예시는 다음과 같다.

- source file id
- original file name
- workspace kind
- file role
- exported row count

이 정보는 이후 workbook을 다시 확인하거나 검토할 때 유용하다.

## Export 범위 규칙

HeartSound data의 경우:

- export는 data file로부터 생성된 derived parameter row를 사용한다
- invalid cycle은 제외된다

즉, export된 table은 UI에서 사용되는 valid cycle structure와 동일한 기준을 따른다.

## Repository 내부의 Documentation Layer

현재 repository에는 이미 여러 층위의 documentation이 존재한다.

### 1. Current Implementation Spec

이 문서는 현재 Tool이 구현상 어떤 방식으로 동작하는지를 기록한다.

현재 파일:

- `process/current_implementation_spec.md`

### 2. Product Requirements Document

이 문서는 제품 수준의 요구사항과 시스템 framing을 정리한다.

현재 파일:

- `product_requirements_document.md`

### 3. Heartsound Parameter Formula Reference

이 문서는 현재 구현된 HeartSound parameter set의 formula 정의를 기록한다.

현재 파일:

- `process/heartsound_parameter_formula_reference.md`

## `ideas` 폴더의 역할

`ideas` 폴더는 개념 정리와 기획을 위한 계층이다.

현재 이 폴더에는 다음이 포함된다.

- 이전 단계의 idea/code note
- parameter 기획 자료
- 지금처럼 추가되고 있는 구조화된 concept 문서

이 역할은 `process`와는 다르다.

### `process`

- 현재 제품과 실제 반영된 동작을 설명한다

### `ideas`

- 구조화된 개념, category, design reasoning, 미래 지향적 documentation organization을 설명한다

## 왜 이 카테고리가 중요한가

export와 documentation이 없다면, 이 Tool은 다음 측면에서 활용이 어려워진다.

- 협업자에게 설명하기
- 안전하게 확장하기
- 의도된 동작과 실제 동작을 검증하기
- 저장 가능한 output이 필요한 연구 workflow에 적용하기

즉, 이 카테고리는 code, UI, external artifact 사이의 연속성을 만들어준다.

## 현재 강점

현재 export/documentation model은 이미 다음을 지원한다.

- 재현 가능한 parameter download
- repository 기반 지식 보존
- implementation spec, product intent, formula detail의 분리

이는 이후 개발을 이어가기 위한 강한 기반이 된다.

## 현재 한계

일부 documentation은 아직 다음 위치에 분산되어 있다.

- source comment
- process 문서
- idea note
- UI 동작 자체

즉, 앞으로도 지속적인 정리와 통합이 여전히 중요하다.

## 향후 확장 메모

향후 가능한 확장 방향은 다음과 같다.

- export schema versioning
- workbook export에 더 풍부한 metadata 추가
- 사용자 선택 기반 export subset
- source metadata로부터 생성되는 문서
- formula 문서와 code identifier 간의 더 긴밀한 연결

## 요약

현재 export 및 documentation 구조는 Tool이 live UI session을 넘어 지속성을 가지게 해준다.

이 구조는 다음을 제공한다.

- 다운로드 가능한 computed parameter workbook
- implementation 문서
- requirement 문서
- formula 문서
- `ideas` 폴더를 통한 concept-organization 문서

즉, 이 카테고리는 Tool이 시간이 지나도 유지되고, 설명되고, 재사용될 수 있도록 해주는 기반이다.