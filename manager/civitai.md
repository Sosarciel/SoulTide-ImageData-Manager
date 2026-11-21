<div style="font-size: 1.2em;">
时装和纯样式提示词请参考标准提示样例图片与 [版本变更说明 (About this version)]。
<br/>
<strong>这是传统 Diffusion 模型版本。</strong> DiT 模型版本 (Anima / MOSS) 请直接前往本页面的 [推荐资源 (Suggested Resources)] 栏目查看。
<br/><br/>
For fashion and pure style prompts, please refer to the standard prompt sample pictures and [About this version].
<br/>
<strong>This is the traditional Diffusion version.</strong> For DiT models (Anima / MOSS), please check the [Suggested Resources] section on this page.
</div>
<br/>

# 版本说明 Version Descriptions
## Pony
- **基础模型:** [**MugenMaluMix SDXL**](https://civitai.com/models/345933/mugenmalumix-sdxl) - **v4.2**
- **兼容性:** 可在其他 **Pony** 系列模型上使用
- **训练方式:** **Lora**
- **Base Model:** [**MugenMaluMix SDXL**](https://civitai.com/models/345933/mugenmalumix-sdxl) - **v4.2**
- **Compatibility:** Works with other **Pony-series** models
- **Training Method:** **Lora**
---
## IL
- **基础模型:** [**Hassaku XL (Illustrious)**](https://civitai.com/models/140272?modelVersionId=1617798) - **v2.1fix**
- **兼容性:** 可在其他 **Illustrious** 系列模型上使用
- **训练方式:** **Lora**
- **备注:** 若使用 **Hassaku XL (Illustrious)**，请避免使用 **v2.1fix 以上版本**
- **Base Model:** [**Hassaku XL (Illustrious)**](https://civitai.com/models/140272?modelVersionId=1617798) - **v2.1fix**
- **Compatibility:** Works with other **Illustrious-series** models
- **Training Method:** **Lora**
- **Note:** If you are using **Hassaku XL (Illustrious)**, avoid versions **above v2.1fix**
---
## ILLC
- 同 **IL** 版本，但使用 **LyCORIS LoCon** 方式训练
- Same as the **IL** version, but trained using **LyCORIS LoCon**
---
## ILWAILC
- **基础模型:** [**WAI-illustrious-SDXL**](https://civitai.com/models/827184?modelVersionId=2514310) - **v16.0**
- **训练方式:** 使用 **LyCORIS LoCon**
- **兼容性:** 可在其他 **Illustrious** 系列模型上使用
- **Base Model:** [**WAI-illustrious-SDXL**](https://civitai.com/models/827184?modelVersionId=2514310) - **v16.0**
- **Training Method:** Trained with **LyCORIS LoCon**
- **Compatibility:** Works with other **Illustrious-series** models
---
## About the version number
- **Pony (特例):** 版本号为数据集与训练方式版本, 最高版本号为 **Pony** 下的最新推荐版本, 目前均落后于 **其他版本**
- **其他版本:** 版本号格式遵循 `{cate}V{x}.{y}` (例如 `ILV1.0`), 最高版本号为最终版本
  - **cate:** 类别代号 (如 `IL` / `ILLC` / `ILWAILC`; 同 `x` 不同代号如 `ILV1.0 / ILLCV1.0` 表示使用相同数据集, 仅训练方式或基模不同)
  - **x:** 数据集版本
  - **y:** 训练参数/超参数版本
- **Pony (Exception):** The version number represents the dataset and training method version. The highest number is the latest recommended version under **Pony**, though all currently lag behind **Other Versions**.
- **Other Versions:** Version tag follows `{cate}V{x}.{y}` (e.g. `ILV1.0`), with the highest version number being the final version.
  - **cate:** Category identifier / code (e.g. `IL` / `ILLC` / `ILWAILC`; same `x` with different codes like `ILV1.0 / ILLCV1.0` indicates the same dataset with different training methods or base models)
  - **x:** Dataset version
  - **y:** Training parameter / hyperparameter version
