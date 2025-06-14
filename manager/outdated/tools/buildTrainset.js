const fs = require('fs');
const path = require('path');
const { UtilFT } = require("@zwa73/utils");
const { program } = require("commander");

program
    .version("0.0.1")
    .description("构造训练集")
    .requiredOption("-nl, --name_list <string[]>","需要构造的角色名",(str)=>str.split(','))
    .parse(process.argv);
const opts = program.opts();
const rootPath = process.cwd();
console.log('当前目录:'     , rootPath);
console.log('命令行参数:'   , process.argv);
console.log('解析结果:'     , opts);
const trangSetPath = path.join(rootPath,"TraingSet");

// 输入字符串数组
const nameList = opts.name_list;

//遍历角色 
for(const charName of nameList){
    //待处理文件夹
    const processFolder = path.join(trangSetPath,charName,"process");
    //创建角色build文件夹
    const buildFolder = path.join(trangSetPath,charName,"build");
    UtilFT.ensurePathExistsSync(buildFolder,true);
    //加载info文件根据info处理
    const infoPath = path.join(processFolder,"info.json");
    const infoJson = UtilFT.loadJSONFileSync(infoPath);

    //遍历角色的不同概念
    for(const typeName in infoJson){
        const typeObj = infoJson[typeName];
        //概念训练集所在的文件夹
        const typeFolderList = typeObj["folder_list"];
        //概念训练次数
        const trainCount = typeObj["train_count"];
        //带数字的概念名
        const buildTypeName = trainCount+"_"+typeName;
        //概念文件夹
        const typeFolder = path.join(buildFolder,buildTypeName);
        console.log(typeFolder)
        UtilFT.ensurePathExistsSync(typeFolder,true);
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
        const filelist = fs.readdirSync(typeFolder);
        for(const fileName of filelist){
            const ext = path.extname(fileName);
            if(ext!=".txt")
                continue;
            const fullpath = path.join(typeFolder,fileName);
            /**@type string */
            let str = fs.readFileSync(fullpath,"utf-8");
            //console.log(str)
            let list = str.split(", ");
            list.push(...typeTags)
            //添加下划线
            //list = list.map(element => {
            //    return element.trim().replaceAll(" ","_")
            //});
            fs.writeFileSync(fullpath, list.join(", "));
        }
    }
}