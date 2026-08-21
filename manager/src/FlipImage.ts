import { Command } from "commander";
import path from "pathe";
import { eitherize, Failed, match, Stream, Success, UtilFT } from "@zwa73/utils";
import sharp from "sharp";

export async function flipImageToPNG(
    inputPath: string,
    outputPath: string,
    direction: string = "h"
): Promise<void> {
    let pipeline = sharp(inputPath);
    const dir = direction.toLowerCase();

    const horizontal = dir.includes("h") || dir === "both" || dir === "horizontal";
    const vertical = dir.includes("v") || dir === "both" || dir === "vertical";

    if (horizontal) pipeline = pipeline.flop();
    if (vertical) pipeline = pipeline.flip();

    await pipeline.png().toFile(outputPath);
}

export const CmdFlipImage = (program: Command) => program
    .command("Flip-Image")
    .alias("flipimage")
    .description("将图片进行水平/垂直翻转并转为png")
    .argument("<input>", "输入文件夹")
    .argument("<output>", "输出文件夹")
    .option("-d, --direction <dir>", "翻转方向 (h: 水平, v: 垂直, both/hv: 两者同时)", "h")
    .option("-s, --suffix <string>", "输出文件名后缀", "_flipped")
    .action(async (input: string, output: string, opt: { direction: string; suffix: string }) => {
        const { direction, suffix } = opt;
        const files = await UtilFT.fileSearchGlob(input, "**/*.{jpg,jpeg,png,webp}");
        const _flipImageToPNG = eitherize(flipImageToPNG);

        await Stream.from(files, 8).map(async (inputpath) => {
            const rpath = path.relative(input, inputpath);
            const parsed = path.parse(rpath);

            // 在文件名后插入 suffix 并统一转换为 .png
            const outFileName = `${parsed.name}${suffix}.png`;
            const fulloutpath = path.join(output, parsed.dir, outFileName);

            await UtilFT.ensurePathExists(path.dirname(fulloutpath), { dir: true });

            match(
                await _flipImageToPNG(inputpath, fulloutpath, direction),
                {
                    [Success]: () => undefined,
                    [Failed]: (v) => console.error(`处理失败 [${inputpath}]:`, v.result),
                }
            );
        }).apply();
    });