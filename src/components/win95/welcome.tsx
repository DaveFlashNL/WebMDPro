import React from 'react';
import { Button, WindowContent } from 'react95';
import { makeStyles } from '@material-ui/core/styles';
import { pair } from '../../redux/actions';
import { Dispatch } from '@reduxjs/toolkit';
import { AboutDialog } from '../about-dialog';
import { MinidiscSpec, NetMDService } from '../../services/interfaces/netmd';

const useStyles = makeStyles(theme => ({
    pairingMessage: {
        color: 'red',
        marginTop: theme.spacing(1),
    },
    windowContent: {
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
}));

export interface W95WelcomeProps {
    dispatch: Dispatch<any>;
    pairingFailed: boolean;
    pairingMessage: string;
    createService: () => NetMDService;
    spec: MinidiscSpec;
    connectName: string;
}

export const W95Welcome = (props: W95WelcomeProps) => {
    let { dispatch, pairingFailed, pairingMessage, createService, spec, connectName } = props;
    const classes = useStyles();
    return (
        <>
            <WindowContent className={classes.windowContent}>
                <p style={{ paddingBottom: 8 }}>Press the button to connect to a NetMD device</p>
                <Button style={{ minWidth: 90 }} onClick={() => dispatch(pair(createService(), spec))}>
                    {connectName}
                </Button>
                <p style={{ visibility: pairingFailed ? 'visible' : 'hidden' }} className={classes.pairingMessage}>
                    {pairingMessage}
                </p>
            </WindowContent>
            <AboutDialog />
        </>
    );
};
