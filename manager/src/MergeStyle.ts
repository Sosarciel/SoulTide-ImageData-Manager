import { Command } from 'commander';
import { CSV, StyleCsv } from './Util';
import path from 'pathe';
import { CURRENT_VER_DIR_NAME, DATA_PATH, getModelDir, STYLE_BASE_PATH, STYLE_FILE_NAME, STYLE_OTHER_PATH, STYLE_PATH, STYLE_SCENE_PATH } from './Config.schema';
import fs from 'fs';


//const str = `
//ssan
//neg:34`.trim();

//console.log(str.match(/^([\s\S]+?)(?:(?:\nneg:([\s\S]+))|$)/))

function exTrim(str:string, charsToRemove:string) {
    // 构造正则表达式，匹配头尾的空白字符和指定符号
    const regex = new RegExp(`^[${charsToRemove}\\s]+|[${charsToRemove}\\s]+$`, 'g');
    return str.replace(regex, '');
}
export const parseStylesTxt = (txt:string)=>{
    const regex = /(.+):\n([\s\S]+?)(\n\n|$)/g;
    const negRegex = /^([\s\S]+?)(?:(?:\nneg:([\s\S]+))|$)/
    const matchList = txt.replace(/\r\n/g,'\n').matchAll(regex);
    const resultList:StyleCsv=[];
    for (const match of matchList) {
        const negMatch = match[2].match(negRegex)!;
        resultList.push({
            name:match[1],
            prompt:exTrim(negMatch[1],','),
            negative_prompt:exTrim((negMatch[2]??''),',')
        });
    }
    if (resultList.length === 0) throw `无法解析${txt}`;
    return resultList;
}
export const getCurrentStyles = async (charName:string)=>{
    const currentDir = path.join(getModelDir(charName),CURRENT_VER_DIR_NAME);
    const verlist = await fs.promises.readdir(currentDir);
    if(verlist.length<=0) throw `当前版本目录${currentDir}为空`;
    //if(verlist.length>1) throw `当前版本目录${currentDir}不唯一`;

    const namedcsv = await Promise.all(verlist.map(async ver=>{
        const currentVerDir = path.join(currentDir,ver);
        const styleTxt = await fs.promises.readFile(path.join(currentVerDir,STYLE_FILE_NAME),'utf-8');
        const styleList = parseStylesTxt(styleTxt);
        return styleList.map(s=>{
            const csv:StyleCsv[number]= {
                ...s,
                name:`${s.name}_${ver}`
            }
            return csv;
        });
    }));
    return namedcsv.flat();
}

export const getStyles = async (csvPath:string,ignoreHarder:boolean=true):Promise<StyleCsv>=>{
    const baseStyle = await CSV.parse(await fs.promises.readFile(csvPath,'utf-8'));
    const formatJson = baseStyle.map(([name,prompt,negative_prompt])=>({name,prompt,negative_prompt}));
    return ignoreHarder ? formatJson.slice(1) : formatJson;
}


export const CmdMergeStyle = (program: Command) => program
    .command("Merge-Style")
    .alias("mergestyle")
    .description("合并提示为csv")
    .action(async()=>{
        const charNameList = await fs.promises.readdir(DATA_PATH);
        const outstyles:StyleCsv = [];
        for(const charName of charNameList){
            try{
                const styleList = await getCurrentStyles(charName);
                outstyles.push(...styleList);
            }catch(e){
                console.warn((e as Error).message);
            }
        }
        const addstr = await CSV.stringify([
            ...await getStyles(STYLE_BASE_PATH,false),
            ...outstyles,
            ...parseStylesTxt(await fs.promises.readFile(STYLE_OTHER_PATH,'utf-8')),
            ...parseStylesTxt(await fs.promises.readFile(STYLE_SCENE_PATH,'utf-8')),
        ]);
        //console.log(addstr);
        await fs.promises.writeFile(STYLE_PATH,addstr.trim(),'utf-8');
});