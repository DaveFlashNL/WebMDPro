import React from 'react';
import { Checkbox, FormControlLabel, TextField } from '@material-ui/core';
import { CustomParameterInfo, CustomParameterType } from '../custom-parameters';

export function renderCustomParameter(
    parameter: CustomParameterInfo,
    value: any,
    parameterChangeCallback: (varName: string, newValue: any) => void
) {
    const handleParameterChange = (event: any, type: CustomParameterType, name: string) => {
        parameterChangeCallback(
            name,
            type === 'string' ? event.target.value : type === 'number' ? parseInt(event.target.value) : event.target.checked
        );
    };

    const fullWidth = { minWidth: '100%' };

    switch (parameter.type) {
        case 'boolean':
            return (
                <FormControlLabel
                    control={<Checkbox checked={value} onChange={e => handleParameterChange(e, parameter.type, parameter.varName)} />}
                    label={parameter.userFriendlyName}
                    style={fullWidth}
                    key={parameter.varName}
                />
            );
        case 'string':
            return (
                <TextField
                    key={parameter.varName}
                    label={parameter.userFriendlyName}
                    error={parameter.validator ? !parameter.validator(value) : false}
                    value={value || ''}
                    onChange={e => handleParameterChange(e, parameter.type, parameter.varName)}
                    style={fullWidth}
                />
            );
        case 'number':
            return (
                <TextField
                    label={parameter.userFriendlyName}
                    error={parameter.validator ? !parameter.validator(value) : false}
                    type="number"
                    value={value || 0}
                    onChange={e => handleParameterChange(e, parameter.type, parameter.varName)}
                    style={fullWidth}
                    key={parameter.varName}
                />
            );
    }
}
