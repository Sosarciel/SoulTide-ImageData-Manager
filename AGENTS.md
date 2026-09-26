# 记忆范畴
- ComfyUI-Conductor 与 ComfyUI-Server 内的记忆高度内聚，对于 ComfyUI 相关项目，写入关于其记忆时应标记范畴 `scope=ComfyUI`

# 重要目录结构
- `model/character/**` 依照角色id与模型版本区分存储了当前使用的角色style
- `Style-Manager/styles/style_list/*` 存储了一些典型style样例
- `Style-Manager/styles/styles.csv` 这是将所有style合并的最终文件，巨大单体csv，需小心查看
- `ComfyUI-Conductor/Workspace/Payload/**` 存储了`ComfyUI-Conductor`代码工作流的数据提供者
- `Prompt-Classifier/src/pattern/**` 存储了手动记录并分类的danbooru的tag

# 子项目简介
- `Prompt-Classifier` 提供一cli用于快速分类/过滤/提取 danbooru tag
- `ComfyUI-Conductor` 使用`ts代码工作流`与`md文件payload`调度ComfyUI进行生图任务，并提供一个用以扩展ComfyUI后端能力的网关，以及一个单独不附带后端的ComfyUI前端启动器
- `ComfyUI-Server` 提供一个ComfyUI插件 `ComfyUI-Server\ComfyUI-Sosarciel` 与一些ComfyUI可通过HttpPost简单调用的服务
- `model` 上传至huggingface的模型
- `dataset` 上传至huggingface的训练集
- `manager` 处理dataset时常用的工具集
