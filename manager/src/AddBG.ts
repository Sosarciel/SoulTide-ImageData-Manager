import sharp from 'sharp';
import { Command } from 'commander';
import fs from 'fs';
import path from 'pathe';
import { UtilFT } from '@zwa73/utils';


export const CmdAddBG = (program: Command) => program
    .command("Add-BG")
    .alias("addbg")
    .description("添加背景")
    .argument("<input>", "输入文件夹")
    .argument("<output>", "输出文件夹")
    .option("-c, --color <white|black>", "背景颜色","white")
    .action(async(inputDir:string,outputDir:string,opt: { color: string })=>{
        const files = await fs.promises.readdir(inputDir);
        console.log('读取输入文件夹:', inputDir);
        console.log('文件列表:', files);

        // 设置背景颜色
        const backgroundColor = opt.color === 'black'
            ? { r: 0, g: 0, b: 0, alpha: 1 }
            : { r: 255, g: 255, b: 255, alpha: 1 };

        await UtilFT.ensurePathExists(outputDir,{dir:true});

        // 遍历所有文件
        const plist = files.map(async file => {
            const inputPath = path.join(inputDir, file);
            const outputPath = path.join(outputDir, file);
            console.log('处理文件:', inputPath);
            // 获取图片的大小
            const metadata = await sharp(inputPath).metadata();
            await sharp({create:{
                width: metadata.width!,
                height: metadata.height!,
                channels: 4,
                background: backgroundColor
            }}).png()
            .composite([{ input: inputPath, blend: 'over' }])
            .toFile(outputPath);
            console.log('保存图片成功:', outputPath);
        });
        await Promise.all(plist);
});
