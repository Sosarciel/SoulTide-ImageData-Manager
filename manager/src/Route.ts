import { program } from "commander";
import { CmdAddBG } from "./AddBG";
import { CmdBuildTrainingSet } from "./BuildTrainingSet";
import { CmdStatTrainingSet } from "./StatTrainingSet";
import { CmdBuildInfo } from "./BuildInfo";
import { CmdCheckTrainingset } from "./CheckTrainingset";
import { CmdExtractFirstFrame } from "./ExtractFirstFrame";
import { CmdCollectCharPrompt } from "./CollectCharPrompt";
import { CmdBuildStyle } from "./BuildStyle";
import { CmdScaleImage } from "./ScaleImage";
import { CmdEvalLog } from "./EvalLog";
import { CmdResizeImage } from "./ResizeImage";
import { CmdBuildMetadata } from "./BuildMetadata";
import { CmdBuildConfig } from "./BuildConfig";
import { CmdFixFileext } from "./FixFileext";
import { CmdFlattenAlpha } from "./FlattenAlpha";
import { CmdConvertGif } from "./ConvertGif";

export async function cliRoute() {
    CmdAddBG(program);
    CmdBuildTrainingSet(program);
    CmdStatTrainingSet(program);
    CmdBuildInfo(program);
    CmdCheckTrainingset(program);
    CmdExtractFirstFrame(program);
    CmdCollectCharPrompt(program);
    CmdBuildStyle(program);
    CmdScaleImage(program);
    CmdEvalLog(program);
    CmdResizeImage(program);
    CmdBuildMetadata(program);
    CmdBuildConfig(program);
    CmdFixFileext(program);
    CmdFlattenAlpha(program);
    CmdConvertGif(program);
    program.parse(process.argv);
}
cliRoute();