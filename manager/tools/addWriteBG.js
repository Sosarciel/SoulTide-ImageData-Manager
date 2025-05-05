const sharp = require('sharp');
const { program } = require("commander");
const fs = require('fs');
const path = require('path');

program
    .version("0.0.1")
    .description("添加白底")
    .requiredOption("-i, --input <string>","输入文件夹")
    .requiredOption("-o, --output <string>","输出文件夹")
    .parse(process.argv);
const opts = program.opts();
const rootPath = process.cwd();
console.log('当前目录:'     , rootPath);
console.log('命令行参数:'   , process.argv);
console.log('解析结果:'     , opts);

// 获取输入和输出文件夹的路径
const inputDir = opts.input;
const outputDir = opts.output;

// 读取输入文件夹中的所有文件
fs.readdir(inputDir, (err, files) => {
    console.log('读取输入文件夹:', inputDir);
    console.log('文件列表:', files);

    if (err) {
        console.error('读取输入文件夹时出错:', err);
        return;
    }

    // 遍历所有文件
    files.forEach(file => {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file);

        console.log('处理文件:', inputPath);

        // 获取图片的大小
        sharp(inputPath)
            .metadata()
            .then(metadata => {
                //console.log('图片大小:', metadata);
                // 创建一个与原图大小相同，颜色为白色的新图片
                return sharp({create: {
                    width: metadata.width,
                    height: metadata.height,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }})
                .png()
                .composite([{ input: inputPath, blend: 'over' }])
                .toFile(outputPath);
            })
            .then(() => {
                console.log('保存图片成功:', outputPath);
            })
            .catch(err => console.error('处理图片时出错:', err));
    });
});
