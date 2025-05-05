import { Command } from 'commander';
import {addPromptset, excludePrompt, ExcludePromptOpt, getPatternsCategory} from '@sosarciel-stablediffusion/prompt-classifier';
import { parseStrlist } from './Util';

export const CmdExcludePrompt = (program: Command) => program
    .command("Exclude-Prompt")
    .alias("excludeprompt")
    .description("匹配并排除style")
    .argument("<input>", "输入prompt 逗号分隔",(str)=>str.replace(/[\r\n]/g,'').replace(/_/g,' ').split(','))
    .option("-e, --exclude <list>", `排除列表 *为全部 逗号分隔 允许值为:${Object.keys(getPatternsCategory()).join('|')}`,parseStrlist)
    .action(async(input:string[],opt?:ExcludePromptOpt)=>{
        const onjinput = input.reduce((acc,k)=>{
            acc[k.trim()]=1;
            return acc;
        },{} as Record<string,number>);
        if(opt?.exclude?.[0]=="*") opt.exclude = await getPatternsCategory();
        const {exclude,remaining} = await excludePrompt(onjinput,opt);
        console.log(`exclude:\n${exclude.join(', ')}`);
        console.log(`remaining:\n${remaining.join(', ')}`);
});
