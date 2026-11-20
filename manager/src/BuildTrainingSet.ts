import { Command } from "commander";
import fs from 'fs';
import path from 'pathe';
import { UtilFT } from "@zwa73/utils";
import { TrainingSetInfo, INFO_FILE_NAME, getTrainingSetDir, getProcessedDir } from "./Config.schema";
import { parseStrlist } from "./Util";

export const CmdBuildTrainingSet = (program: Command) => program
    .command("Build-TrainingSet")
    .alias("buildtrainingset")
    .description("生成训练集")
    .argument("<namelist>", "需要构造的角色名 空格 分割", parseStrlist)
    .action(async (nameList: string[]) => {
        // 遍历角色 
        for (const charName of nameList) {
            console.log(`\n================= 开始构建角色: ${charName} =================`);
            
            // 待处理文件夹
            const processFolder = getProcessedDir(charName);
            if (!fs.existsSync(processFolder)) {
                console.error(`[错误] 角色待处理目录不存在: ${processFolder}`);
                continue;
            }

            // 检查并加载 info 配置文件
            const infoPath = path.join(processFolder, INFO_FILE_NAME);
            if (!fs.existsSync(infoPath)) {
                console.error(`[错误] 找不到配置文件: ${infoPath}`);
                continue;
            }
            const infoJson = await UtilFT.loadJSONFile(infoPath) as TrainingSetInfo;

            // 创建角色 build 文件夹
            const buildFolder = getTrainingSetDir(charName);
            await UtilFT.ensurePathExists(buildFolder, { dir: true });

            // ------------------ 全局检查：核对该角色所有文件夹的 PNG 与 TXT 配对 ------------------
            let missingTxtCount = 0;
            for (const typeName in infoJson) {
                const typeFolderList = infoJson[typeName]["folder_list"] ?? [];
                for (const folder of typeFolderList) {
                    const fullpath = path.join(processFolder, folder);
                    if (!fs.existsSync(fullpath)) {
                        console.error(`[错误] 概念子目录不存在: ${fullpath}`);
                        continue;
                    }

                    const files = fs.readdirSync(fullpath);
                    for (const fileName of files) {
                        const parsed = path.parse(fileName);
                        // 只检查 png 是否有对应的 txt
                        if (parsed.ext.toLowerCase() === '.png') {
                            const expectedTxt = path.join(fullpath, `${parsed.name}.txt`);
                            if (!fs.existsSync(expectedTxt)) {
                                console.warn(`[缺失 TXT] [${folder}] ${fileName} 没有对应的 .txt 标注文件`);
                                missingTxtCount++;
                            }
                        }
                    }
                }
            }

            if (missingTxtCount > 0) {
                console.warn(`[警告] 角色 ${charName} 共发现 ${missingTxtCount} 个 PNG 缺失 TXT 文件！`);
                console.error(`[中断] 终止角色 ${charName} 的构建。`);
                continue;
            }
            // -----------------------------------------------------------------------------------

            // 遍历角色的不同概念并执行构建
            for (const typeName in infoJson) {
                const typeObj = infoJson[typeName];
                const typeFolderList = typeObj["folder_list"] ?? [];
                const trainCount = typeObj["train_count"];
                const buildTypeName = `${trainCount}_${typeName}`;
                const typeFolder = path.join(buildFolder, buildTypeName);

                console.log(`生成概念目录: ${typeFolder}`);
                await UtilFT.ensurePathExists(typeFolder, { dir: true });

                const typeTags = typeObj["tags"];

                // 遍历概念训练集所在的文件夹，复制文件
                for (const folder of typeFolderList) {
                    const fullpath = path.join(processFolder, folder);
                    if (!fs.existsSync(fullpath)) continue;

                    const filelist = fs.readdirSync(fullpath);
                    for (const fileName of filelist) {
                        const filePath = path.join(fullpath, fileName);

                        // 过滤子目录，避免 readFileSync 抛出 EISDIR 异常
                        const stat = fs.statSync(filePath);
                        if (stat.isDirectory()) continue;

                        // 重命名时添加文件夹名前缀
                        const typefullpath = path.join(typeFolder, `${folder}_${fileName}`);
                        const fileContent = fs.readFileSync(filePath);
                        fs.writeFileSync(typefullpath, fileContent);
                    }
                }

                // 遍历 build 的概念文件夹，给 .txt 追加概念 tag
                const filelist = await fs.promises.readdir(typeFolder);
                for (const fileName of filelist) {
                    const ext = path.extname(fileName);
                    if (ext !== ".txt") continue;

                    const fullpath = path.join(typeFolder, fileName);
                    const str = await fs.promises.readFile(fullpath, "utf-8");

                    // 拆分 tags 并追加
                    const list = str.trim().length > 0 ? str.split(", ") : [];
                    if (typeTags && typeTags.length > 0) {
                        list.unshift(...typeTags);
                    }

                    fs.writeFileSync(fullpath, list.join(", "));
                }
            }
            console.log(`角色 ${charName} 构建完成！`);
        }
    });