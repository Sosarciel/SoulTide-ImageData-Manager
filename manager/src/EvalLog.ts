import { s2l } from "@zwa73/utils";
import { Command } from "commander";
import fs from 'fs';





const log = `
steps:  43%|██████████████████████████████████████████████▍                                                             | 989/2300 [11:24<15:07,  1.44it/s, avr_loss=0.0706]
saving checkpoint: /root/autodl-tmp/output/Juewa-000043.safetensors
steps:  43%|██████████████████████████████████████████████▍                                                             | 989/2300 [11:24<15:07,  1.44it/s, avr_loss=0.0806]
saving checkpoint: /root/autodl-tmp/output/Juewa-000044.safetensors
steps:  43%|██████████████████████████████████████████████▍                                                             | 989/2300 [11:24<15:07,  1.44it/s, avr_loss=0.0906]
saving checkpoint: /root/autodl-tmp/output/Juewa-000045.safetensors
`


const getStepData = (text:string)=>{
    const matchIter = text
        .replaceAll('\r\n','\n')
        .matchAll(/avr_loss=([0-9.]+)\]\n.+\/(.+)\.safetensors/g);
    return [...matchIter].map(m=>({
        epoch:m[2],loss:parseFloat(m[1])
    }))
    .sort((a,b)=>s2l(a.loss,b.loss))
    .reduce((acc,cur)=>({
        ...acc,
        [cur.epoch]:cur.loss
    }),{} as Record<string,number>)
}


export const CmdEvalLog = (program: Command) => program
    .command("Eval-Log")
    .alias("evallog")
    .description("检查log并进行排序")
    .argument("<logPath>", "需要检查的log文件目录")
    .action(async (logPath:string)=>{
        const fileText = await fs.promises.readFile(logPath,'utf-8');
        console.table(getStepData(fileText))
    });