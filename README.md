# Booster Recovery Simulator

Three.js 기반 수동 구동기 검사 및 합성 비행 기록 뷰어. 기본 화면의 30초 시퀀스는 손으로 작성한 키프레임이다.

## 실행

Node 22 이상에서 `npm ci`, `npm run dev`를 실행한다. 배포 빌드는 `npm run build`이며 출력은 `out/`이다.

## 모드와 단위

- 기록 재생은 JSON 키프레임의 10개 관측 채널을 0.05초 간격으로 선형 보간한다. 입력 4개와 벡터 3개는 다음 키프레임까지 유지한다. 재생 버튼, 타임라인 또는 파일 선택으로 표시할 프레임을 바꿀 수 있다.
- 수동 모드는 현재 프레임의 계측값을 고정하고 스로틀·노즐·핀·냉가스 시각 효과를 조작한다. W/S, D/A, G/F, K/J로 각 입력을 올리거나 내린다. 측풍 슬라이더는 표시할 관측 채널을 변경한다.
- ONNX 기록 분석 모드는 `public/models/booster_policy.onnx`와 `norm_stats.json`이 준비되면 활성화된다. 통계 키는 obs_mean, obs_var, epsilon, clip_obs이며 Z점수 클리핑을 사용한다. 입력 [1,10]에 대한 출력 [1,4]를 원래 기록과 독립적으로 표시한다.

관측 순서는 x, y (m), vx, vy (m/s), theta (rad), omega (rad/s), RP-1, N₂ (kg), 동압 (Pa), 측풍 (m/s)이다. X는 오른쪽, Y는 위쪽이다. HUD는 각도와 동압을 도·kPa로 표시한다. 기록의 벡터는 추력·핀·항력 순서의 도식용 XY 성분이다. 구동기는 스로틀, 짐벌, 핀, RCS 순서이다. 스로틀 −0.2 미만은 소등 표시이다.

## 재현

`rl-pipeline/env/booster_recovery_env.py`가 기본 기록과 기준 보간값을 정의한다. Python 3.10 이상에서 이 파일을 실행하면 `public/sample.json`이 생성된다. `python rl-pipeline/verify_parity.py`는 Node에서 같은 기록을 해석해 0 및 8.5 m/s 측풍 채널에서 관측·입력·시간·단계와 표시 벡터를 대조한다. 이 검사는 기록 디코더를 검증한다. 모델 추론으로 다음 비행 상태를 계산하는 폐루프 동역학은 구현 범위에서 제외했다.
