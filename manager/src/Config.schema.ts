import path from "pathe";




export type TrainingSetInfo = {
    [key: string]: {
        train_count: number;
        folder_list: string[];
        tags?: string[];
        exclude_tags?: string[];
    };
};

export const ROOT_PATH = path.join(__dirname, '..', '..');
export const DATASET_PATH = path.join(ROOT_PATH,'dataset');
export const DATA_PATH = path.join(ROOT_PATH,'dataset','character');
export const MANAGER_PATH = path.join(ROOT_PATH,'manager');
export const STYLES_PATH = path.join(MANAGER_PATH,'styles');

export const getResourceDir = (charName: string) => path.join(DATA_PATH,charName,RESOURCES_DIR_NAME);
export const getCategorizedDir = (charName: string) => path.join(DATA_PATH,charName,CATEGORUZED_DIR_NAME);
export const getProcessedDir = (charName: string) => path.join(DATA_PATH,charName,PROCESSED_DIR_NAME);
export const getTrainingSetDir = (charName: string) => path.join(DATA_PATH,charName,TRAINING_SET_DIR_NAME);
export const RESOURCES_DIR_NAME = 'resources';
export const CATEGORUZED_DIR_NAME = 'categorized';
export const PROCESSED_DIR_NAME = 'processed';
export const TRAINING_SET_DIR_NAME = 'training_set';

export const INFO_FILE_NAME = 'info.json';
export const STYLE_FILE_NAME = 'styles.txt';

export const MODEL_PATH = path.join(ROOT_PATH,'model','character');
export const getModelDir = (charName: string) => path.join(MODEL_PATH,charName);
export const CURRENT_VER_DIR_NAME = 'current';
export const ARCHIVE_VER_DIR_NAME = 'archive';
