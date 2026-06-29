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

type Region = {min:number,max:number};
const parseRegion = (v?:string)=>{
    if(v==undefined) return undefined;
    const match = v.match(/^(.+?)_(.+)$/);
    if(match==null) return undefined;
    const v1 = parseInt(match[1]);
    const v2 = parseInt(match[2]);
    if(isNaN(v1)||isNaN(v2)) return undefined;
    if(v1>v2) return { min:v2,max:v1 }
    return {min:v1,max:v2 }
}

export const CmdEvalLog = (program: Command) => program
    .command("Eval-Log")
    .alias("evallog")
    .description("检查 log 并按照 Loss 排序过滤")
    .argument("<logPath>", "需要检查的 log 文件路径")
    .option("-s, --stride-range <string>", "滑窗裁剪的步幅范围 (如 15_30)", parseRegion, {min:15,max:30})
    .option("-c, --clip-range <string>", "滑窗裁剪的全局 Epoch 边界 (如 15_100)", parseRegion, {min:15,max:100})
    .option("-f, --start-floor <number>", "首次裁剪的初始 Epoch 下限门槛", v=>parseInt(v), 80)
    .action(async (logPath:string,opt:{
        strideRange?:Region,
        clipRange?:Region,
        startFloor?:number,
    })=>{
        const {
            strideRange,
            clipRange = {min:0,max:Infinity},
            startFloor = 0,
        } = opt;
        const fileText = await fs.promises.readFile(logPath,'utf-8');
        const data = getStepData(fileText);
        console.table(data);
        if(strideRange!=undefined){
            // 展开
            const list = Object.entries(data).map(v=>{
                const match = v[0].match(/-(\d+)$/);
                const epoch = match==null ? NaN : parseInt(match[1]);
                return { name:v[0], epoch,loss:v[1] }
            }).sort((a,b)=>s2l(a.loss,b.loss));

            // 确定last
            const lastepoch = list.find(v=>isNaN(v.epoch));
            if(lastepoch!=undefined)
                lastepoch.epoch = list.reduce((acc,{epoch})=>
                    epoch!=Infinity&&acc<=epoch ? epoch+1 : acc,0);

            // 多次选取
            const itemList:{name:string,epoch:number,loss:number}[] = [];
            const sliceList = list.filter(({epoch})=>epoch>=clipRange.min && epoch<=clipRange.max);
            const getItem = (curr:number,min?:number)=>{
                return sliceList.find(({epoch})=>{
                    return min!=undefined
                        ? curr-strideRange.min > epoch && epoch>min
                        : curr-strideRange.min > epoch && curr-strideRange.max<epoch
                })
            }
            let currEpoch = Infinity;
            while(true){
                const item = getItem( currEpoch, currEpoch==Infinity ? startFloor : undefined);
                if(item==undefined) break;
                currEpoch = item.epoch;
                itemList.push(item);
            }
            console.table(Object.fromEntries(itemList.map(v=>[v.name,v.loss])));
        }
    });