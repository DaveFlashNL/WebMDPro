import React, { useState, useEffect } from 'react';
import { Capability } from '../services/interfaces/netmd';
import { useShallowEqualSelector } from '../utils';

import FormHelperText from '@material-ui/core/FormHelperText';
import { Controls } from './controls';
import Box from '@material-ui/core/Box';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginRight: -theme.spacing(2),
        flexFlow: 'wrap',
    },
    formControl: {
        minWidth: 120,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
    factoryModeNotice: {
        marginBottom: theme.spacing(2),
        fontWeight: 'bold',
    },
}));

export function LineInDeviceSelect({ handleChange, inputDeviceId }: { handleChange: (ev: any) => void; inputDeviceId: string }) {
    const classes = useStyles();

    const { deviceCapabilities } = useShallowEqualSelector(state => state.main);
    const [devices, setInputDevices] = useState<{ deviceId: string; label: string }[]>([]);

    useEffect(() => {
        async function updateDeviceList() {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            let devices = await navigator.mediaDevices.enumerateDevices();
            let inputDevices = devices
                .filter(device => device.kind === 'audioinput')
                .map(device => ({ deviceId: device.deviceId, label: device.label }));
            setInputDevices(inputDevices);
        }
        updateDeviceList();
    }, [setInputDevices]);
    return (
        <React.Fragment>
            {deviceCapabilities.includes(Capability.factoryMode) && (
                <Typography component="h4" variant="body2" className={classes.factoryModeNotice}>
                    It looks like this player supports exploits, so you might be capable of enjoying RH1-style minidisc ripping. Please
                    check the three-dots menu at the top right to enable it or enter the full homebrew mode for more information.
                </Typography>
            )}

            <Typography component="p" variant="body2">
                1. Connect your MD Player line-out to your PC audio line-in.
            </Typography>
            <Typography component="p" variant="body2">
                2. Use the controls at the bottom right to play some tracks.
            </Typography>
            <Typography component="p" variant="body2">
                3. Select the input source. You should hear the tracks playing on your PC.
            </Typography>
            <Typography component="p" variant="body2">
                4. Adjust the input gain and the line-out volume of your device.
            </Typography>
            <Box className={classes.container}>
                <FormControl className={classes.formControl}>
                    <Select value={inputDeviceId} onChange={handleChange} displayEmpty className={classes.selectEmpty}>
                        <MenuItem value="" disabled>
                            Input Source
                        </MenuItem>
                        {devices.map(device => (
                            <MenuItem key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>Input Source</FormHelperText>
                </FormControl>
                <Controls />
            </Box>
        </React.Fragment>
    );
}
