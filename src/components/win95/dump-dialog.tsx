import React, { useState, useEffect } from 'react';
import { Button, WindowHeader, Fieldset, Select } from 'react95';
import { Capability } from '../../services/interfaces/netmd';
import { Controls } from '../controls';
import { DialogOverlay, DialogWindow, DialogFooter, DialogWindowContent, WindowCloseIcon, FooterButton } from './common';

export const W95DumpDialog = (props: {
    handleClose: () => void;
    handleChange: (
        ev: React.ChangeEvent<{
            value: unknown;
        }>
    ) => void;
    handleStartTransfer: () => void;
    visible: boolean;
    deviceCapabilities: Capability[];
    inputDeviceId: string;
    isCapableOfDownload: boolean;
}) => {
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

    if (!props.visible) {
        return null;
    }

    return (
        <DialogOverlay>
            <DialogWindow>
                <WindowHeader style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: '1 1 auto' }}>{props.isCapableOfDownload ? 'Download' : 'Record'} Selected Tracks</span>
                    <Button onClick={props.handleClose}>
                        <WindowCloseIcon />
                    </Button>
                </WindowHeader>
                <DialogWindowContent>
                    <div style={{ width: '100%', display: 'flex', alignItems: 'flex-Start', flexDirection: 'column' }}>
                        {props.isCapableOfDownload ? (
                            <p>As you are using a Sony MZ-RH1, it is possible to download tracks via NetMD.</p>
                        ) : (
                            <React.Fragment>
                                {props.deviceCapabilities.includes(Capability.factoryMode) && (
                                    <p style={{ marginBottom: '32px' }}>
                                        It looks like this player supports the homebrew mode - it might be capable of RH1-style digital
                                        transfer. Please check the homebrew mode for more information.
                                    </p>
                                )}

                                <p>1. Connect your MD Player line-out to your PC audio line-in.</p>
                                <p>2. Use the controls at the bottom right to play some tracks.</p>
                                <p>3. Select the input source. You should hear the tracks playing on your PC.</p>
                                <p>4. Adjust the input gain and the line-out volume of your device.</p>
                                <Fieldset label="Input Source" style={{ display: 'flex', flex: '1 1 auto', margin: '32px 0' }}>
                                    <Select
                                        defaultValue={props.inputDeviceId || ''}
                                        options={devices
                                            .concat([{ deviceId: '', label: 'None' }])
                                            .map(({ deviceId, label }) => ({ value: deviceId, label }))}
                                        onChange={props.handleChange}
                                        width={200}
                                    />
                                </Fieldset>
                            </React.Fragment>
                        )}
                        <Controls />
                    </div>
                    <DialogFooter>
                        <div style={{ flex: '1 1 auto' }}></div>
                        <FooterButton onClick={props.handleClose}>Cancel</FooterButton>
                        <FooterButton onClick={props.handleStartTransfer} disabled={props.inputDeviceId === ''}>
                            Start {props.isCapableOfDownload ? 'Download' : 'Record'}
                        </FooterButton>
                    </DialogFooter>
                </DialogWindowContent>
            </DialogWindow>
        </DialogOverlay>
    );
};
