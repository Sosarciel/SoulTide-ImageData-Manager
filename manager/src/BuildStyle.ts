import { Command } from 'commander';
import { capitalizeFirstLetter, matchCharDir, MatchPattern, parseStrlist } from './Util';
import path from 'pathe';
import { INFO_FILE_NAME, PROCESSED_DIR_NAME, STYLE_FILE_NAME, TrainingSetInfo } from './Config.schema';
import { UtilFT } from '@zwa73/utils';
import { collectCharPrompt } from './CollectCharPrompt';
import fs from 'fs';
import { ExtractPromptResult, extractPrompt, getPatternsCategory } from '@sosarciel-stablediffusion/imagedata-prompt-classifier';




export const buildStyle = async (charPattern:MatchPattern)=>{
    const chardirlist = await matchCharDir(charPattern);
    for(const chardir of chardirlist){
        const outobj:Record<string,ExtractPromptResult> = {};
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
            const prompts = await collectCharPrompt(charname,subtag);

            const midPrompts = await extractPrompt(prompts,{
                //保留全部 人物主体/服装
                reserve:['figure','clothing'],
                //仅明确排除已知项 避免includes划定范围
                exclude:(await getPatternsCategory()).map(v=>v.name),
                minrep:2
            });
            const processedPrompts = await extractPrompt(midPrompts.reserve,{
                //明确排除全部 脚部服装/特定角色
                exclude:['footwear','character']
            });
            processedPrompts.exclude.push(...midPrompts.exclude);

            //获取名称
            const subtagformat = /^st(.+?)-c(.+)$/;
            const subtagname = subtagformat.exec(subtag);
            if(subtagname==null) throw `${charname} ${subtag} 子标签名称不符合格式`;
            const pname = charname+capitalizeFirstLetter(subtagname[2]);
            processedPrompts.reserve = [`st${subtagname[1]}`,subtag,'1girl',...processedPrompts.reserve.filter(s=>!tags.includes(s))];
            outobj[pname] = processedPrompts;
        }

        //获取纯提示
        for(const maintag of mainTags){
            //提取子标签
            const prompts = await collectCharPrompt(charname,maintag);

            const midPrompts = await extractPrompt(prompts,{
                //保留全部 人物主体
                reserve:['figure'],
                //仅明确排除已知项 避免includes划定范围
                exclude:(await getPatternsCategory()).map(v=>v.name),
                minrep:3
            });
            const processedPrompts = await extractPrompt(midPrompts.reserve,{
                //明确排除全部 脚部服装/特定角色
                exclude:['footwear','character']
            });
            processedPrompts.exclude.push(...midPrompts.exclude);

            //获取名称
            const tagformat = /^st([^-]+)$/;
            const tagname = tagformat.exec(maintag);
            if(tagname==null) throw `${charname} ${maintag} 标签名称不符合格式`;
            const pname = charname+'Pure';
            processedPrompts.reserve = [maintag,'1girl',...processedPrompts.reserve.filter(s=>!tags.includes(s))];
            outobj[pname] = processedPrompts;
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