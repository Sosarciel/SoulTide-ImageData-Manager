import { Command } from 'commander';
import path from 'pathe';
import { UtilFT } from '@zwa73/utils';
import fs from 'fs';
import { matchCharDir } from './Util';




/**收集角色提示词 */
export const collectCharPrompt = async (charPattern:string|RegExp,keywordPattern?:string|RegExp)=>{
    keywordPattern??= '.*';
    keywordPattern = keywordPattern instanceof RegExp ? keywordPattern : new RegExp(keywordPattern);

    const chardirlist = await matchCharDir(charPattern);
    const outMap:Record<string,number> = {};
    for(const charDir of chardirlist){
        if(!await UtilFT.pathExists(charDir))
            throw `${charDir} 不存在`;

        const trainsetDir = path.join(charDir, 'training_set');

        const promptFileList = await UtilFT.fileSearchGlob(trainsetDir,'/**/*.txt');
        const fileDataList = await Promise.all(promptFileList.map(fp=>fs.promises.readFile(fp,'utf-8')));
        for(const str of fileDataList){
            if(!keywordPattern.test(str)) continue;
            str.split(',').forEach(k=>{
                k = k.replace(/[\n\r]/g,'').replace(/_/g,' ').trim();
                if(k=='') return;
                outMap[k]??=0;
                outMap[k]++;
            });
        }
    }
    return outMap;
}

export const CmdCollectCharPrompt = (program: Command) => program
    .command("Collect-CahrPrompt")
    .alias("collectcharprompt")
    .description("收集角色提示词")
    .argument("<charname>", "角色名")
    .option("-k, --keyword <list>", `提取关键字`)
    .action(async(charname:string,opt:{keyword:string})=>{
        const map = await collectCharPrompt(charname,opt.keyword);
        console.log(map);
        //const list = Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,_])=>k);
        //console.log(list.join(', '));
});