import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import path from "pathe";
import sharp from "sharp";

import { UtilFT, eitherize, match, Stream, Success, Failed, UtilFunc } from "@zwa73/utils";

type JxlDecodeFn = (data: ArrayBuffer | Uint8Array) => Promise<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
}>;

let patched = false;
const doPatch = ()=>{
    if(patched) return;
    // 1. 修复 Node.js 原生 fetch 不支持 file:// 协议导致 @jsquash 加载 wasm 崩溃的问题
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init?: any) => {
        const urlStr = input instanceof URL ? input.href : String(input);
        if (urlStr.startsWith("file:")) {
            const buffer = await fs.readFile(fileURLToPath(urlStr));
            return new Response(buffer, {
                headers: { "Content-Type": "application/wasm" },
            });
        }
        return originalFetch(input, init);
    };
    patched=true;
}

/** 自动根据后缀将图像转换为 PNG */
async function convertToPNG(inputPath: string, outputPath: string) {
    const ext = path.extname(inputPath).toLowerCase();

    // JXL 单独走 WASM 解码
    if (ext === ".jxl") {
        doPatch();
        const fileBuffer = await fs.readFile(inputPath);
        const decodeJxl = await UtilFunc.dynamicImport<JxlDecodeFn>("@jsquash/jxl/decode.js");
        const image = await decodeJxl!(fileBuffer);

        await sharp(Buffer.from(image.data.buffer), {
            raw: {
                width: image.width,
                height: image.height,
                channels: 4,
            },
        })
        .png()
        .toFile(outputPath);
        return;
    }

    // 其他常规格式（JPG, WEBP, AVIF, TIFF, GIF 等）原生 sharp 处理
    await sharp(inputPath)
        .png()
        .toFile(outputPath);
}

export const CmdConvertPng = (program: Command) =>
    program
        .command("Convert-Png")
        .alias("convertpng")
        .description("依照 Glob 模式将匹配到的图像批量转换为 PNG")
        .argument("<input>", "输入文件夹")
        .argument("<output>", "输出文件夹")
        .argument("<pattern>", "Glob 匹配模式")
        .action(async (input: string, output: string, pattern: string) => {
            const files = await UtilFT.fileSearchGlob(input, pattern);
            const op = eitherize(convertToPNG);

            await Stream.from(files, 8)
                .map(async (inputPath) => {
                    const rpath = path.relative(input, inputPath);
                    const { dir, name } = path.parse(rpath);
                    const outputPath = path.join(output, dir, `${name}.png`);

                    await UtilFT.ensurePathExists(path.dirname(outputPath), { dir: true });

                    match(await op(inputPath, outputPath), {
                        [Success]: () => {},
                        [Failed]: (v) => console.error(`Error [${inputPath}]: ${v.result}`),
                    });
                })
                .apply();
        });