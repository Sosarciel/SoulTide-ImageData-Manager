import { Command } from "commander";
import fs from 'fs';
import path from 'pathe';
import { UtilFT } from "@zwa73/utils";
import { getProcessedDir } from "./Config.schema";
import { parseStrlist } from "./Util";


/**读取 PNG 文件的前几位数据来判断图片大小。
 * @param  filePath - PNG 文件的路径。
 * @returns - 返回一个包含宽度和高度的对象。
 */
async function getPngDimensions(filePath: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
        fs.open(filePath, 'r', (err, fd) => {
            if (err) return reject(err);

            const buffer = Buffer.alloc(24); // 读取前 24 个字节
            fs.read(fd, buffer, 0, 24, 0, (err) => {
                if (err) {
                    fs.close(fd, () => reject(err));
                    return;
                }

                // 检查 PNG 文件签名
                if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
                    console.log(`${filePath} 不是有效的 PNG 文件`);
                    fs.close(fd, () => resolve({ width: 0, height: 0 }));
                    return;
                }

                // 读取宽度和高度
                const width = buffer.readUInt32BE(16);
                const height = buffer.readUInt32BE(20);

                fs.close(fd, (err) => {
                    if (err) return reject(err);
                    resolve({ width, height });
                });
            });
        });
    });
}

export const CmdCheckTrainingset = (program: Command) => program
    .command("Check-TrainingSet")
    .alias("checktrainingset")
    .description("检查processd的训练集")
    .argument("<namelist>", "需要检查的角色名 空格 分割", parseStrlist)
    .requiredOption("-h, --height <number>", "高度", parseInt)
    .requiredOption("-w, --width <number>", "宽度", parseInt)
    .action(async (nameList: string[], opt: { width: number, height: number }) => {
        console.log(opt);
        // 遍历角色 
        for (const charName of nameList) {
            // 创建角色build文件夹
            const buildFolder = getProcessedDir(charName);
            await UtilFT.ensurePathExists(buildFolder, { dir: true });

            const filelist = await UtilFT.fileSearchGlob(buildFolder, `**/*`);

            for (const filePath of filelist) {
                const parsed = path.parse(filePath);
                const ext = parsed.ext;

                const stat = await fs.promises.stat(filePath);
                if (stat.isDirectory()) continue;
                if (ext === '.txt') continue;
                if (ext !== '.png') {
                    console.log(`${filePath} ${ext} 不符合png格式`);
                    continue;
                }

                // ------------------ 新增：检查对应的 txt ------------------
                const txtPath = path.join(parsed.dir, `${parsed.name}.txt`);
                if (!fs.existsSync(txtPath)) {
                    console.log(`[缺失 TXT] ${filePath} 未找到对应的标注文件 (${parsed.name}.txt)`);
                } else {
                    // 可选：如果还需要检查 txt 是否为空文件，可以取消下面两行注释
                    // const txtStat = await fs.promises.stat(txtPath);
                    // if (txtStat.size === 0) console.log(`[TXT 为空] ${txtPath} 标注内容为空`);
                }
                // ---------------------------------------------------------

                // 检查图片尺寸
                const { width, height } = await getPngDimensions(filePath);
                if (width !== opt.width || height !== opt.height) {
                    console.log(`${filePath} ${width}x${height} 不符合目标`);
                }
            }
        }
    });