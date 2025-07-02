import { Command } from "commander";
import path from "pathe";
import sharp from "sharp";
import { UtilFT, eitherize, match, Stream, Success, Failed } from "@zwa73/utils";
import fs from "fs";

/** 将图像中 alpha > 0 的所有像素设为 alpha = 255 */
async function flattenAlphaToOpaque(inputPath: string, outputPath: string) {
    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    const raw = await image.ensureAlpha().raw().toBuffer();
    const channels = 4;

    for (let i = 0; i < raw.length; i += channels) {
        if (raw[i + 3] < 128)
            raw[i + 3] = 0;
        else raw[i + 3] = 255; // 设为完全不透明
    }

    await sharp(raw, { raw: { width: width!, height: height!, channels } })
        .png()
        .toFile(outputPath);
}

export const CmdFlattenAlpha = (program: Command) =>
    program
        .command("Flatten-Alpha")
        .alias("flattenalpha")
        .description("将 alpha 不为 0 的像素全部设为完全不透明")
        .argument("<input>", "输入文件夹")
        .argument("<output>", "输出文件夹")
        .action(async (input: string, output: string) => {
            const files = await UtilFT.fileSearchGlob(input, "**/*.png");
            const op = eitherize(flattenAlphaToOpaque);

            await Stream.from(files, 8)
                .map(async (inputPath) => {
                    const rpath = path.relative(input, inputPath);
                    const outputPath = path.join(output, rpath);
                    await UtilFT.ensurePathExists(path.dirname(outputPath), { dir: true });

                    match(await op(inputPath, outputPath), {
                        [Success]: () => {},
                        [Failed]: (v) => console.error(`Error: ${v.result}`),
                    });
                })
                .apply();
        });
