export type CustomParameters = { [key: string]: string | number | boolean };
export type CustomParameterType = 'string' | 'number' | 'boolean';
export type CustomParameterInfo = {
    userFriendlyName: string;
    varName: string;
    type: CustomParameterType;
    defaultValue?: string | number | boolean;
    validator?: (content: string) => boolean;
};

export function isAllValid(archetype: CustomParameterInfo[] | undefined, parameters: CustomParameters) {
    for (let parameter of archetype ?? []) {
        if (parameter.validator) {
            if (!parameter.validator(parameters[parameter.varName]?.toString())) {
                return false;
            }
        }
    }
    return true;
}

function getDefaultForType(type: CustomParameterType) {
    switch (type) {
        case 'boolean':
            return false;
        case 'string':
            return '';
        case 'number':
            return 0;
    }
}

export function initializeParameters(archetype: CustomParameterInfo[] | undefined) {
    let emptyParameters: CustomParameters = {};
    for (let param of archetype ?? []) {
        emptyParameters[param.varName] = param.defaultValue || getDefaultForType(param.type);
    }
    return emptyParameters;
}
