import { Command } from 'commander';
import {addPromptset, ExtractPromptOpt, extractPrompt, getPatternsCategory, getPromptCountMap, PromptCountMap} from '@sosarciel-stablediffusion/imagedata-prompt-classifier';
import { parseStrlist } from './Util';

export const CmdExtractPrompt = (program: Command) => program
    .command("Extract-Prompt")
    .alias("extractprompt")
    .description("匹配并排除style")
    .argument("<input>", "输入prompt 逗号分隔",(str)=>str.replace(/[\r\n]/g,'').replace(/_/g,' ').split(','))
    .option("-e, --exclude <list>", `排除列表 *为全部 逗号分隔 允许值为:${Object.keys(getPatternsCategory()).join('|')}`,parseStrlist)
    .option("-r, --reserve <list>", `保留列表 *为全部 逗号分隔 允许值为:${Object.keys(getPatternsCategory()).join('|')}`,parseStrlist)
    .action(async(input:string[],opt?:ExtractPromptOpt)=>{
        const inputmap = getPromptCountMap(input);
        if(opt?.exclude?.[0]=="*") opt.exclude = await getPatternsCategory();
        const {exclude,reserve} = await extractPrompt(inputmap,opt);
        console.log(`exclude:\n${exclude.join(', ')}`);
        console.log(`reserve:\n${reserve.join(', ')}`);
});
