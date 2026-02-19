import sharp from "sharp";
import { DATA_PATH } from "./Config.schema";
import fs from 'fs';
import path from "path";
const gifFrames = require('gif-frames');

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

export type CombineGridImageOptions = {
    inpaths: string[][];
    outpath: string;
    /**
     * direction: 第一维的排列方向
     * - 'horizontal' (默认): 第一维是行(Row)。例如 [[左上, 右上], [左下, 右下]]
     * - 'vertical': 第一维是列(Column)。例如 [[左上, 左下], [右上, 右下]]
     */
    direction?: 'horizontal' | 'vertical';
}

export async function combineGridImages(options: CombineGridImageOptions): Promise<void> {
    const { inpaths, outpath, direction = 'horizontal' } = options;

    if (!inpaths || inpaths.length === 0 || inpaths.every(arr => arr.length === 0)) {
        throw new Error('No images provided');
    }

    // 1. 数据标准化：无论输入什么 direction，我们都统一转换为 "先行后列 (Row-Major)" 格式 [行][列]
    let gridPaths: string[][] = [];
    if (direction === 'horizontal') {
        gridPaths = inpaths;
    } else {
        // 矩阵转置：将 Column-Major 转为 Row-Major
        const numCols = inpaths.length;
        const numRows = Math.max(...inpaths.map(col => col.length));
        for (let r = 0; r < numRows; r++) {
            gridPaths[r] = [];
            for (let c = 0; c < numCols; c++) {
                gridPaths[r][c] = inpaths[c]?.[r]; // 容错处理缺省元素
            }
        }
    }

    const numRows = gridPaths.length;
    const numCols = Math.max(...gridPaths.map(row => row.length));

    // 2. 并行加载所有图片和元数据 (保留 2D 结构)
    const gridData = await Promise.all(
        gridPaths.map(row =>
            Promise.all(row.map(async (imgpath) => {
                if (!imgpath) return null; // 处理空位
                const buffer = await sharp(imgpath).toBuffer();
                const metadata = await sharp(buffer).metadata();
                return {
                    buffer,
                    width: metadata.width ?? 0,
                    height: metadata.height ?? 0
                };
            }))
        )
    );

    // 3. 动态计算每一列的宽度和每一行的高度 (自适应不同尺寸的图片)
    const colWidths = new Array(numCols).fill(0);
    const rowHeights = new Array(numRows).fill(0);

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            const data = gridData[r][c];
            if (data) {
                colWidths[c] = Math.max(colWidths[c], data.width);
                rowHeights[r] = Math.max(rowHeights[r], data.height);
            }
        }
    }

    // 计算总画布尺寸
    const outputWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const outputHeight = rowHeights.reduce((sum, h) => sum + h, 0);

    // 4. 计算每张图片的绝对坐标 (left, top)
    const compositeOptions: sharp.OverlayOptions[] = [];
    let currentY = 0;

    for (let r = 0; r < numRows; r++) {
        let currentX = 0;
        for (let c = 0; c < numCols; c++) {
            const data = gridData[r][c];
            if (data) {
                compositeOptions.push({
                    input: data.buffer,
                    left: currentX,
                    top: currentY
                });
            }
            currentX += colWidths[c]; // X 轴向右推进当前列的宽度
        }
        currentY += rowHeights[r]; // Y 轴向下推进当前行的高度
    }

    // 5. 渲染输出
    await sharp({
        create: {
            width: outputWidth,
            height: outputHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 } // 透明背景兜底
        }
    })
    .composite(compositeOptions)
    .png()
    .toFile(outpath);
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