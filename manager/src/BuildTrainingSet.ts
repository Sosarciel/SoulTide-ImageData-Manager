import { Command } from "commander";
import fs from 'fs';
import path from 'pathe';
import { UtilFT } from "@zwa73/utils";
import { DATA_PATH, TrainingSetInfo, TRAINING_SET_DIR_NAME, PROCESSED_DIR_NAME, INFO_FILE_NAME } from "./Config.schema";
import { parseStrlist } from "./Util";


export const CmdBuildTrainingSet = (program: Command) => program
    .command("Build-TrainingSet")
    .alias("buildtrainingset")
    .description("生成训练集")
    .argument("<namelist>", "需要构造的角色名 空格 分割",parseStrlist)
    .action(async (nameList:string[])=>{
        //遍历角色 
        for(const charName of nameList){
            //待处理文件夹
            const processFolder = path.join(DATA_PATH,charName,PROCESSED_DIR_NAME);
            //创建角色build文件夹
            const buildFolder = path.join(DATA_PATH,charName,TRAINING_SET_DIR_NAME);
            await UtilFT.ensurePathExists(buildFolder,{dir:true});
            //加载info文件根据info处理
            const infoPath = path.join(processFolder,INFO_FILE_NAME);
            const infoJson = await UtilFT.loadJSONFile(infoPath) as TrainingSetInfo;

            //遍历角色的不同概念
            for(const typeName in infoJson){
                const typeObj = infoJson[typeName];
                //概念训练集所在的文件夹
                const typeFolderList = typeObj["folder_list"];
                //概念训练次数
                const trainCount = typeObj["train_count"];
                //带数字的概念名
                const buildTypeName = `${trainCount}_${typeName}`;
                //概念文件夹
                const typeFolder = path.join(buildFolder,buildTypeName);
                console.log(typeFolder)
                await UtilFT.ensurePathExists(typeFolder,{dir:true});
                //概念tag
                const typeTags = typeObj["tags"];
                //遍历概念训练集所在的文件夹
                for(const folder of typeFolderList){
                    const fullpath = path.join(processFolder,folder);

                    //复制文件到build文件夹
                    const filelist = fs.readdirSync(fullpath);
                    for(const fileName of filelist){
                        const filePath = path.join(fullpath,fileName);
                        //重命名时添加文件夹名
                        const typefullpath = path.join(typeFolder,folder+"_"+fileName);
                        const fileContent = fs.readFileSync(filePath);
                        fs.writeFileSync(typefullpath, fileContent);
                    }
                }

                //遍历build的概念文件夹，添加概念tag
                const filelist = await fs.promises.readdir(typeFolder);
                for(const fileName of filelist){
                    const ext = path.extname(fileName);
                    if(ext!=".txt") continue;
                    const fullpath = path.join(typeFolder,fileName);
                    /**@type string */
                    let str = fs.readFileSync(fullpath,"utf-8");
                    //console.log(str)
                    let list = str.split(", ");
                    list.push(...typeTags??[]);
                    //添加下划线
                    //list = list.map(element => {
                    //    return element.trim().replaceAll(" ","_")
                    //});
                    fs.writeFileSync(fullpath, list.join(", "));
                }
            }
        }
    });