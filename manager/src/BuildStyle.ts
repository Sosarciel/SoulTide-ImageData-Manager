import { Command } from 'commander';
import { capitalizeFirstLetter, matchCharDir, MatchPattern, parseStrlist } from './Util';
import path from 'pathe';
import { INFO_FILE_NAME, PROCESSED_DIR_NAME, STYLE_FILE_NAME, TrainingSetInfo } from './Config.schema';
import { UtilFT } from '@zwa73/utils';
import { collectCharPrompt } from './CollectCharPrompt';
import fs from 'fs';
import { ExcludePromptResult, extractPrompt, getPatternsCategory } from '@sosarciel-stablediffusion/imagedata-prompt-classifier';




export const buildStyle = async (charPattern:MatchPattern)=>{
    const chardirlist = await matchCharDir(charPattern);
    for(const chardir of chardirlist){
        const outobj:Record<string,ExcludePromptResult> = {};
        const charname = path.parse(chardir).name;
        //读取info
        const info = await UtilFT.loadJSONFile(path.join(chardir,PROCESSED_DIR_NAME,INFO_FILE_NAME)) as TrainingSetInfo;
        //获取标签
        const tags = Array.from(new Set(Object
            .values(info)
            .map(f=>f.tags??[])
            .flat()));
        //获取可pure的主标签
        const mainTags = tags.filter(t=>!t.includes('-'));
        //获取子标签
        const subTags  = tags.filter(t=>t.includes('-'));

        //获取子标签提示
        for(const subtag of subTags){
            //提取子标签
            const ps = await collectCharPrompt(charname,subtag);
            const pps = await extractPrompt(ps,{
                reserve:['figure','clothing'],
                minrep:2
            });
            //获取名称
            const subtagformat = /^st(.+?)-c(.+)$/;
            const subtagname = subtagformat.exec(subtag);
            if(subtagname==null) throw `${charname} ${subtag} 子标签名称不符合格式`;
            const pname = charname+capitalizeFirstLetter(subtagname[2]);
            pps.reserve = [`st${subtagname[1]}`,subtag,'1girl',...pps.reserve.filter(s=>!tags.includes(s))];
            outobj[pname] = pps;
        }

        //获取纯提示
        for(const maintag of mainTags){
            //提取子标签
            const ps = await collectCharPrompt(charname,maintag);
            const pps = await extractPrompt(ps,{
                reserve:['figure'],
                minrep:3
            });
            //获取名称
            const tagformat = /^st([^-]+)$/;
            const tagname = tagformat.exec(maintag);
            if(tagname==null) throw `${charname} ${maintag} 标签名称不符合格式`;
            const pname = charname+'Pure';
            pps.reserve = [maintag,'1girl',...pps.reserve.filter(s=>!tags.includes(s))];
            outobj[pname] = pps;
        }

        //生成文本
        let outstr = '';
        const outlist = Object.entries(outobj)
            .forEach(([k,v])=>outstr+=
                `${k}:\n`+
                `exclude:\n`+
                `${v.exclude.join(', ').trim()}\n`+
                `reserve:\n`+
                `${v.reserve.join(', ').trim()}\n`+
                `\n`
            )
        await fs.promises.writeFile(path.join(chardir,PROCESSED_DIR_NAME,STYLE_FILE_NAME),outstr.trim());
        //await UtilFT.writeJSONFile(path.join(chardir,PROCESSED_DIR_NAME,STYLE_FILE_NAME),outobj);
    }
}

export const CmdBuildStyle = (program: Command) => program
    .command("Build-Style")
    .alias("buildstyle")
    .description("生成提示")
    .argument("<namelist>", "需要构造的角色名 空格 分割",parseStrlist)
    .action(async(charname:string[])=>{
        await buildStyle(charname);
});