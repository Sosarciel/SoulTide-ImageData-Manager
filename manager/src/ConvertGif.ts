import { Command } from "commander";
import path from "pathe";
import sharp from "sharp";
import { UtilFT, eitherize, match, Stream, Success, Failed } from "@zwa73/utils";

/** 将 PNG 图像转换为静态 GIF */
async function convertPNGtoGIF(inputPath: string, outputPath: string) {
    await sharp(inputPath)
        .gif({
            colours: 256,
            dither: 1.0
        })
        .toFile(outputPath);
}

export const CmdConvertGif = (program: Command) =>
    program
        .command("Convert-Gif")
        .alias("convertgif")
        .description("将 PNG 图像转换为静态 GIF")
        .argument("<input>", "输入文件夹")
        .argument("<output>", "输出文件夹")
        .action(async (input: string, output: string) => {
            const files = await UtilFT.fileSearchGlob(input, "**/*.png");
            const op = eitherize(convertPNGtoGIF);

            await Stream.from(files, 8)
                .map(async (inputPath) => {
                    const rpath = path.relative(input, inputPath);
                    const outputPath = path.join(output, rpath).replace(/\.png$/i, ".gif");
                    await UtilFT.ensurePathExists(path.dirname(outputPath), { dir: true });

                    match(await op(inputPath, outputPath), {
                        [Success]: () => {},
                        [Failed]: (v) => console.error(`Error: ${v.result}`),
                    });
                })
                .apply();
        });
