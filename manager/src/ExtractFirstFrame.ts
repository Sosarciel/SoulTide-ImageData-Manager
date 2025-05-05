import { Command } from "commander";
import path from 'pathe';
import { UtilFT } from "@zwa73/utils";
import { extractFirstFrameToPNG } from "./Util";


export const CmdExtractFirstFrame = (program: Command) => program
    .command("Extract-FirstFrame")
    .alias("extractfirstframe")
    .description("提取gif第一帧图像为png")
    .argument("<input>", "输入文件夹")
    .argument("<output>", "输出文件夹")
    .action(async (input:string,output:string)=>{
        const gifs = await UtilFT.fileSearchGlob(input,'**/*.gif');
        for(const gifpath of gifs){
            const rpath = path.relative(input,gifpath);
            const fulloutpath = path.join(output,rpath).replace('.gif','.png');
            await UtilFT.ensurePathExists(path.dirname(fulloutpath),{dir:true});
            extractFirstFrameToPNG(gifpath,fulloutpath);
        }
    });