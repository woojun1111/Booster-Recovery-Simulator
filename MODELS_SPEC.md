# 3D 모델 명세

정적 파일은 `public/models/`에 있으며 웹 경로는 `/models/<파일명>`이다. 용량은 십진 MB로 표기했다.

| 원본 파일명 | 배포 파일명 | MB | 노드 / 메쉬 |
|---|---|---:|---:|
| `falcon_9_-_spacex.glb` | `falcon9_variant_1.glb` | 5.971 | 150 / 76 |
| `falcon_9_spacex_rocket.glb` | `falcon9_variant_2.glb` | 7.919 | 67 / 32 |
| `spacex_falcon_9_and_dragon_2.glb` | `falcon9_dragon_2.glb` | 8.916 | 248 / 100 |
| `spacex_drone_barge.glb` | `landing_pad.glb` | 3.347 | 8 / 3 |

## 좌표와 크기

네 파일 모두 glTF 2.0의 오른손 Y-up 장면이다. 각 루트는 노드 0 `Sketchfab_model`이며 이동 (0, 0, 0), 스케일 (1, 1, 1), X축 회전 −90°이다. 로더가 이 변환을 적용한다. 아래 값은 기본 장면의 부모 변환과 실제 POSITION 정점을 반영했다. 원본 로컬 accessor 경계는 JSON에 별도로 기록했다.

| 모델 | 최소 XYZ | 최대 XYZ | 치수 XYZ | 중심 XYZ | 지면 이동 Y | 높이 1 계수 |
|---|---|---|---|---|---:|---:|
| `falcon9_variant_1` | -260.4068, 0.6382947, -260.3979 | 260.4068, 7100, 260.3977 | 520.8136, 7099.362, 520.7956 | -3.350628e-05, 3550.319, -7.5126e-05 | -0.6382947 | 0.000140857736 |
| `falcon9_variant_2` | -99.80322, 0.1341111, -102.2151 | 100.0412, 2699.383, 99.52029 | 199.8445, 2699.249, 201.7354 | 0.1190029, 1349.758, -1.347402 | -0.1341111 | 0.000370473481 |
| `falcon9_dragon_2` | -15.1, -2.115286, -15.1 | 15.1, 48.43626, 15.1 | 30.2, 50.55155, 30.2 | 0, 23.16049, 0 | 2.115286 | 0.0197817885 |
| `landing_pad` | -103.0107, -1.79291, -51 | 26, 56.51607, 45 | 129.0107, 58.30898, 96 | -38.50536, 27.36158, -3 | 1.79291 | 0.0171500173 |

가로·세로·높이는 각각 X·Z·Y 치수다. 목표 높이가 H이면 바깥 Group의 균일 스케일을 H × 높이 1 계수로 정하고, 그 Group의 Y 위치를 지면 이동 Y × 균일 스케일로 지정한다. 바지선의 하단은 선체 전체 기준이며 갑판 고도와 구별한다.

## 부품 식별

| 모델 | 대표 노드 번호와 원본 이름 |
|---|---|
| `falcon9_variant_1` | 12 `Merlin 1D Engine Center.001`, 15 `First Stage`, 26 `Grid Fins`, 30 `Cold Gas Thrusters First Stage`, 36 `Landing Leg Hydraulic Holder 3`, 141 `Fairing` |
| `falcon9_variant_2` | 11 `Circle.009_engine_0`, 29 `Plane.013_legs_0`, 57 `Cube.004_fins_0`, 59 `Circle_body_black_0`, 61 `Cylinder.001_fairing_0` |
| `falcon9_dragon_2` | 13 `nosecone`, 17 `body`, 34 `trunk`, 51 `stage_one_rig`, 53 `leg_rig` |
| `landing_pad` | 2 `Barge1`, 4 `Booster`, 6 `Barge2` |

전체 트리는 `manifest.json`의 `sceneRoots`에서 시작해 `nodes[index].children`을 따라간다. 노드의 `mesh`는 `meshes` 배열 번호이고, 각 `primitives`에 재질 번호와 원본 이름이 있다. 같은 부품에 하위 메쉬가 여러 개면 부모 노드를 선택한다. `GLTFLoader`가 이름을 정리할 수 있으므로 정확한 객체는 `gltf.parser.getDependency("node", index)`로 찾는다. 두 번째 모델의 부품 표기는 메쉬와 재질 이름에 근거한다. `body`는 드래곤 캡슐 계층에 있다. 바지선 파일에는 별도 `Booster` 노드도 있다.

네 모델의 내장 애니메이션 클립과 모프 타깃은 모두 0개다. 세 번째 모델에는 스킨 정의가 2개 있다.

## 원본 저작자

네 모델의 내장 라이선스는 CC-BY-4.0이다. 파일명을 변경했으며 원본과 저작자 주소는 명세 JSON에도 보존했다.
- Stanley Creative · [Falcon 9 - SpaceX](https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08)
- artemycz · [Falcon 9 SpaceX rocket](https://sketchfab.com/3d-models/falcon-9-spacex-rocket-58784d6b55ad47d2985f353459759f06)
- Forest Katsch · [SpaceX Falcon 9 and Dragon 2](https://sketchfab.com/3d-models/spacex-falcon-9-and-dragon-2-f709fc945bb2413faf2878aa613cde3d)
- yakudami · [SpaceX drone barge](https://sketchfab.com/3d-models/spacex-drone-barge-9ed1cd7b420c49b19c849dc011fbcc13)

## 뷰포트용 단일 바지선

`/models/barge_aesthetic.glb`는 yakudami의 원본에서 `Barge1`만 추출한 CC-BY-4.0 파생 모델이다. 원본 루트의 회전을 유지하고 XZ 중심을 정렬했다. 변환 후 경계는 X ±26, Z ±48, Y −1.79291~18.50709이다. 뷰포트에서는 균일 배율 0.24와 수면 Y=0을 사용하므로 선저가 약 0.43 장면 단위 잠긴다. 갑판 색상 PNG는 원본과 동일한 1024×1024이며 알파가 255 미만인 픽셀 3,789개를 보존했다. 재질은 단면 금속성·거칠기 PBR과 알파 마스크를 사용한다.
