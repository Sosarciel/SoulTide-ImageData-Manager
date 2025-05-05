import { Command } from "commander";
import path from 'pathe';
import { eitherize, Failed, match, Stream, Success, UtilFT } from "@zwa73/utils";
import { resizeImageToPNG, scaleImageToPNG } from "./Util";
import sharp from "sharp";

export const CmdResizeImage = (program: Command) => program
    .command("Resize-Image")
    .alias("resizeimage")
    .description("将图片安整数倍缩放并转为png")
    .argument("<input>", "输入文件夹")
    .argument("<output>", "输出文件夹")
    .requiredOption("-h, --height <number>", "目标高度",parseInt)
    .requiredOption("-w, --width <number>" , "目标宽度",parseInt)
    .action(async (input:string,output:string,opt:{height:number,width:number})=>{
        const gifs = await UtilFT.fileSearchGlob(input,'**/*.{jpg,png}');
        const _resizeImageToPNG = eitherize(resizeImageToPNG);
        const {height,width} = opt;
        await Stream.from(gifs,8).map(async inputpath=>{
            const rpath = path.relative(input,inputpath);
            const fulloutpath = path.join(output,rpath).replace('.jpg','.png');
            await UtilFT.ensurePathExists(path.dirname(fulloutpath),{dir:true});
            match(
                await _resizeImageToPNG(inputpath,fulloutpath,width,height),{
                [Success]:k=>undefined,
                [Failed]:(k,v)=>console.error(v),
            })
        }).append();
    });