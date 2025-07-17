import sharp from "sharp";
import { DATA_PATH } from "./Config.schema";
const gifFrames = require('gif-frames');
import fs from 'fs';
import path from "path";

/**导出Gif第一帧 */
export async function extractFirstFrameToPNG(gifPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        gifFrames({ url: gifPath, frames: 0, outputType: "png", cumulative: true })
            .then((frameData: any) => {
                const frame = frameData[0].getImage();
                const chunks: Buffer[] = [];

                frame.on("data", (chunk: any) => chunks.push(chunk));
                frame.on("end", () => {
                    const buffer = Buffer.concat(chunks);
                    sharp(buffer)
                        .png()
                        .toFile(outputPath)
                        .then(() => resolve())
                        .catch(reject);
                });
                frame.on("error", reject);
            })
            .catch(reject);
    });
}

/**将字符串中每个单词的首字母大写。
 * @param str - 输入的字符串。
 * @returns - 返回首字母大写的字符串。
 */
export function capitalizeFirstLetter(str: string) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**正则匹配符 */
export type MatchPattern = RegExp|string|(RegExp|string)[];
/**匹配角色
 * @param charPattern - 角色名
 * @returns - 角色文件件夹数组
 */
export async function matchCharDir(charPattern:MatchPattern){
    const charlist = await fs.promises.readdir(DATA_PATH);
    if(!Array.isArray(charPattern)) charPattern = [charPattern];
    const psdList = charPattern.map(p=>p instanceof RegExp ? p : new RegExp(p)) as RegExp[];
    return charlist
        .filter(charname=>psdList.some(p=>p.test(charname)))
        .map(c=>path.join(DATA_PATH,c));
}

export type CombineImageOptions = {
    inpaths: string[];
    outpath: string;
    direction?: 'horizontal' | 'vertical';
}

export async function combineImages(options: CombineImageOptions): Promise<void> {
    const { inpaths, outpath, direction = 'horizontal' } = options;

    if (inpaths.length === 0) throw new Error('No images provided');

    // Load images
    const imageBuffers = await Promise.all(inpaths.map(path => sharp(path).toBuffer()));

    // Get dimensions
    const imageMetadata = await Promise.all(imageBuffers.map(buffer => sharp(buffer).metadata()));

    // Calculate the output image dimensions
    const isHorizontal = direction === 'horizontal';
    const outputWidth = isHorizontal
        ? imageMetadata.reduce((acc, metadata) => acc + (metadata.width ?? 0), 0)
        : Math.max(...imageMetadata.map(metadata => metadata.width ?? 0));

    const outputHeight = isHorizontal
        ? Math.max(...imageMetadata.map(metadata => metadata.height ?? 0))
        : imageMetadata.reduce((acc, metadata) => acc + (metadata.height ?? 0), 0);

    // Create a blank canvas with the calculated dimensions

    let x = 0;
    let y = 0;

    // Composite images onto the canvas
    const canvas = sharp({
        create: {
            width: outputWidth,
            height: outputHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
    }).composite(await Promise.all(imageBuffers.map(async buffer=>{
        const metadata = await sharp(buffer).metadata();
        const opt = {
            input: buffer,
            left: x,
            top: y
        }
        if (isHorizontal) x += metadata.width ?? 0;
        else y += metadata.height ?? 0;
        return opt;
    })));

    // Output the combined image to the specified file path
    await canvas.png().toFile(outpath);
}

//const options: CombineImageOptions = {
//    inpaths: ['image1.png', 'image2.png', 'image3.png'],
//    outpath: 'combined.png',
//    direction: 'vertical'
//};
//
//combineImages(options)
//    .then(() => console.log('Images combined successfully'))
//    .catch(err => console.error('Error combining images:', err));


/**按整数倍缩放图片并转换为PNG格式
 * @param inputPath  - 图片的输入路径（支持jpg/png）
 * @param outputPath - 图片的输出路径
 * @param scale      - 缩放倍数（必须是正整数）
 */
export async function scaleImageToPNG(inputPath: string, outputPath: string, scale: number): Promise<void> {
    if (scale <= 0)
        throw new Error("缩放倍数必须是正数");

    return new Promise((resolve, reject) => {
        sharp(inputPath)
            .metadata() // 获取图片元数据，用于计算新尺寸
            .then((metadata) => {
                if (!metadata.width || !metadata.height)
                    throw new Error("无法获取图片尺寸");

                const newWidth = metadata.width * scale;
                const newHeight = metadata.height * scale;

                return resizeImageToPNG(inputPath,outputPath,newWidth, newHeight);
            })
            .then(() => resolve())
            .catch(reject);
    });
}

/**按目标尺寸缩放图片并转换为PNG格式
 * @param inputPath  - 图片的输入路径（支持jpg/png）
 * @param outputPath - 图片的输出路径
 * @param width      - 目标宽度（必须是正整数）
 * @param height     - 目标高度（必须是正整数）
 */
export async function resizeImageToPNG(inputPath: string, outputPath: string, width: number, height: number): Promise<void> {
    if (width <= 0 || height <= 0)
        throw new Error("目标宽度和高度必须是正数");

    return new Promise((resolve, reject) => {
        sharp(inputPath)
            .resize(width, height) // 直接设置目标宽度和高度
            .png() // 转换为PNG格式
            .toFile(outputPath) // 保存到输出路径
            .then(() => resolve())
            .catch(reject);
    });
}





export const parseStrlist = (str:string)=>str
    .split(/( |,)/)
    .map(s=>s.trim())
    .filter(s=>s.length>0)
    .filter(s=>s!=',')