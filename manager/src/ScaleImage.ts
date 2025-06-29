import { Command } from "commander";
import path from 'pathe';
import { eitherize, Failed, match, Stream, Success, UtilFT } from "@zwa73/utils";
import { scaleImageToPNG } from "./Util";
import sharp from "sharp";

export const CmdScaleImage = (program: Command) => program
    .command("Scale-Image")
    .alias("scaleimage")
    .description("将图片安整数倍缩放并转为png")
    .argument("<input>", "输入文件夹")
    .argument("<output>", "输出文件夹")
    .requiredOption("-s, --scale <number>", `缩放倍率`,Number)
    .requiredOption("-h, --height <number>", "允许的目标高度",parseInt)
    .requiredOption("-w, --width <number>", "允许的目标宽度",parseInt)
    .action(async (input:string,output:string,opt:{scale:number,height:number,width:number})=>{
        const gifs = await UtilFT.fileSearchGlob(input,'**/*.{jpg,png}');
        const _scaleImageToPNG = eitherize(scaleImageToPNG);
        const {scale} = opt;
        await Stream.from(gifs,8).map(async inputpath=>{
            const rpath = path.relative(input,inputpath);
            const fulloutpath = path.join(output,rpath).replace('.jpg','.png');
            await UtilFT.ensurePathExists(path.dirname(fulloutpath),{dir:true});
            const {width,height} = await sharp(inputpath).metadata();
            if(width!*scale!=opt.width || height!*scale!=opt.height){
                console.error(`图片${inputpath}尺寸不符合要求`);
                return;
            }
            match(
                await _scaleImageToPNG(inputpath,fulloutpath,scale),{
                [Success]:k=>undefined,
                [Failed]:v=>console.error(v.result),
            })
        }).apply();
    });