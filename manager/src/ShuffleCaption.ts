import { Command } from 'commander';
import fs from 'fs';
import path from 'pathe';
import { UtilFT } from '@zwa73/utils';

/** 32位 FNV-1a 字符串哈希算法 (用于将文本转为数值种子) */
function fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/** Mulberry32 确定性伪随机数生成器 (PRNG) */
function createPrng(seed: number) {
    let s = seed;
    return function () {
        let t = (s += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 基于确定性 PRNG 的 Fisher-Yates 洗牌算法 */
function deterministicShuffle<T>(array: T[], prng: () => number): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export const CmdShuffleCaption = (program: Command) => program
    .command("Shuffle-Caption")
    .alias("shuffle-tag")
    .alias("shuffletag")
    .description("对训练集内所有 txt 打标文件进行确定性多候选打乱增强 (兼容 MOSS-Image / Kohya)")
    .argument("<input>", "训练集根目录路径")
    .option("-c, --candidates <number>", "生成的打乱候选总数 (含原版)", "8")
    .option("-k, --keep <number>", "前置固定的 Tag 数量 (如保留开头的触发词/角色名)", "0")
    .option("-s, --separator <string>", "多候选分隔符", "---===---")
    .action(async (inputDir: string, opt: { candidates: string; keep: string; separator: string }) => {
        const candidateCount = parseInt(opt.candidates, 10);
        const keepCount = parseInt(opt.keep, 10);
        const separator = opt.separator;

        console.log('读取训练集根目录:', inputDir);
        await UtilFT.ensurePathExists(inputDir, { dir: true });

        // 递归检索所有 txt 文件
        const txtFiles = await UtilFT.fileSearchGlob(inputDir, '**/*.txt');
        console.log(`发现 ${txtFiles.length} 个标注文件，开始处理...`);

        let skippedCount = 0;
        let processedCount = 0;

        const tasks = txtFiles.map(async (filePath) => {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const trimmed = content.trim();

            // 1. 幂等性检查：如果已经包含分隔符，判定为已处理，跳过
            if (trimmed.includes(separator)) {
                console.log('跳过已处理文件:', filePath);
                skippedCount++;
                return;
            }

            // 2. 解析 Tag
            const tags = trimmed
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            // 如果 Tag 数量太少，无法/无需打乱
            if (tags.length <= 1 || tags.length <= keepCount) {
                console.log('Tag 数量过少无需打乱，跳过:', filePath);
                skippedCount++;
                return;
            }

            // 3. 基于原文本 + 路径构建确定性种子（输入一致则结果必然一致）
            const seed = fnv1a(`${path.normalize(filePath)}::${trimmed}`);
            const prng = createPrng(seed);

            // 提取保留的前置词与参与打乱的词
            const fixedTags = tags.slice(0, keepCount);
            const shufflePool = tags.slice(keepCount);

            const candidates: string[] = [trimmed]; // 第1个候选保留原版顺序

            // 生成后续 (N - 1) 个随机但确定的排列
            for (let i = 1; i < candidateCount; i++) {
                const shuffled = deterministicShuffle(shufflePool, prng);
                const fullCandidate = [...fixedTags, ...shuffled].join(', ');
                candidates.push(fullCandidate);
            }

            // 4. 以 MOSS-Image 规范格式写入回文件
            const finalContent = candidates.join(`\n${separator}\n`);
            await fs.promises.writeFile(filePath, finalContent, 'utf-8');
            console.log('打乱成功:', filePath);
            processedCount++;
        });

        await Promise.all(tasks);
        console.log(`处理完成！成功修改: ${processedCount} 个文件，跳过/无需处理: ${skippedCount} 个文件。`);
    });