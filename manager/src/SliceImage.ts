import { Command } from "commander";
import path from 'pathe';
import { Stream, UtilFT } from "@zwa73/utils";
import sharp from "sharp";

/**
 * 计算切分点辅助函数
 */
function getCutPoints(totalLength: number, windowSize: number, step: number): number[] {
    if (totalLength <= windowSize) return [0];
    const points = new Set<number>();
    for (let i = 0; i <= totalLength - windowSize; i += step) {
        points.add(i);
    }
    // 补刀逻辑：保证最后一部分贴合边缘
    points.add(totalLength - windowSize);
    return Array.from(points).sort((a, b) => a - b);
}

export const CmdSliceImage = (program: Command) => program
    .command("Slice-Image")
    .alias("sliceimage")
    .description("将图片等比缩放至最小覆盖尺寸后，进行滑动切分")
    .argument("<input>", "输入文件夹")
    .argument("<output>", "输出文件夹")
    .requiredOption("-w, --width <number>", "目标切片宽度", parseInt)
    .requiredOption("-h, --height <number>", "目标切片高度", parseInt)
    .requiredOption("-o, --offset <number>", "滑动步长(像素)", parseInt)
    .action(async (input: string, output: string, opt: { width: number, height: number, offset: number }) => {
        // 1. 搜索所有图片
        const files = await UtilFT.fileSearchGlob(input, '**/*.{jpg,png,jpeg,webp,bmp}');

        console.log(`找到 ${files.length} 张图片，开始处理...`);

        // 2. 使用 Stream 进行并发控制 (并发数 8)
        await Stream.from(files, 8).map(async (inputpath) => {
            try {
                // 路径计算
                const rpath = path.relative(input, inputpath);
                const fileDir = path.dirname(path.join(output, rpath));
                const filenameNoExt = path.basename(inputpath, path.extname(inputpath));
                await UtilFT.ensurePathExists(fileDir, { dir: true });

                // 1. 读取并修正旋转
                const image = sharp(inputpath).rotate();
                const metadata = await image.metadata();

                if (!metadata.width || !metadata.height) {
                    console.error(`无元数据: ${inputpath}`);
                    return;
                }

                const { width: srcW, height: srcH } = metadata;
                const { width: targetW, height: targetH, offset } = opt;

                // 2. 计算 Cover 比例 (必须取大值，否则无法填满)
                const ratioW = targetW / srcW;
                const ratioH = targetH / srcH;
                const scale = Math.max(ratioW, ratioH);

                // 3. 计算缩放后的尺寸 (逻辑锁定)
                // 通过判定谁是主导边，强制锁定该边为 target 大小，另一边向上取整
                let newW: number, newH: number;

                // 如果 ratioW >= ratioH，说明为了填满宽度，我们需要更大的倍率
                // 此时宽度是瓶颈，宽度必须严格等于 targetW，高度随动
                if (ratioW >= ratioH) {
                    newW = targetW;
                    newH = Math.ceil(srcH * ratioW);
                } else {
                    newH = targetH;
                    newW = Math.ceil(srcW * ratioH);
                }

                // 4. 执行缩放
                const resizedBuffer = await image
                    .resize(newW, newH, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
                    .toBuffer();

                // 5. 二次测量 (防御 Sharp 内部的 1px 误差)
                const resizedImg = sharp(resizedBuffer);
                const realMeta = await resizedImg.metadata();
                const realW = realMeta.width!;
                const realH = realMeta.height!;

                // 6. 滑动切分
                const deltaX = realW - targetW;
                const deltaY = realH - targetH;
                const tasks: Promise<any>[] = [];

                if (deltaX >= 1) {
                    // 宽度溢出，横切
                    const points = getCutPoints(realW, targetW, offset);
                    for (const x of points) {
                        const outName = `${filenameNoExt}_x${x}.png`;
                        tasks.push(
                            resizedImg.clone()
                                .extract({ left: x, top: 0, width: targetW, height: targetH })
                                .png().toFile(path.join(fileDir, outName))
                        );
                    }
                } else if (deltaY >= 1) {
                    // 高度溢出，纵切
                    const points = getCutPoints(realH, targetH, offset);
                    for (const y of points) {
                        const outName = `${filenameNoExt}_y${y}.png`;
                        tasks.push(
                            resizedImg.clone()
                                .extract({ left: 0, top: y, width: targetW, height: targetH })
                                .png().toFile(path.join(fileDir, outName))
                        );
                    }
                } else {
                    // 完美匹配
                    const outName = `${filenameNoExt}_full.png`;
                    tasks.push(
                        resizedImg.clone()
                            .extract({ left: 0, top: 0, width: targetW, height: targetH })
                            .png().toFile(path.join(fileDir, outName))
                    );
                }

                await Promise.all(tasks);

            } catch (error) {
                console.error(`失败 ${inputpath}:`, error);
            }
        }).apply();
        console.log("✅ 全部完成");
    });