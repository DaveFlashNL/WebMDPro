import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteService, pair } from '../redux/actions';

import { useShallowEqualSelector } from '../utils';

import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import IconButton from '@material-ui/core/IconButton';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { TopMenu } from './topmenu';
import ChromeIconPath from '../images/chrome-icon.svg';
import ChromiumIcon from '../images/chromium-icon.svg';
import { W95Welcome } from './win95/welcome';

import SplitButton, { OptionType } from './split-button';
import { createService, getConnectButtonName, getServiceSpec, getSimpleServices, Services } from '../services/interface-service-manager';

import { OtherDeviceDialog } from './other-device-dialog';
import { SettingsDialog } from './settings-dialog';
import { ChangelogDialog } from './changelog-dialog';
import { AboutDialog } from './about-dialog';

import { actions as otherDialogActions } from '../redux/other-device-feature';
import { actions as appActions } from '../redux/app-feature';
import { batchActions } from 'redux-batched-actions';
import { initializeParameters } from '../custom-parameters';

import { isElectron } from '../redux/main-feature';
//import { Button } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { WelcomeTranslations } from '../languages';
const t = WelcomeTranslations;

//uncomment below to test json retrieving
//console.log(lproj.condev);

const useStyles = makeStyles(theme => ({
    main: {
        position: 'relative',
        flex: '1 1 auto',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        alignItems: 'center',
    },
    buttonBox: {
        marginTop: theme.spacing(3),
        minWidth: 200,
    },
    deleteButton: {
        width: theme.spacing(2),
        height: theme.spacing(2),
        verticalAlign: 'middle',
        marginLeft: theme.spacing(-0.5),
        marginRight: theme.spacing(1.5),
    },
    standardOption: {
        marginLeft: theme.spacing(3),
    },
    spacing: {
        marginTop: theme.spacing(1),
    },
    spacing2: {
        marginTop: theme.spacing(2),
    },
    chromeLogo: {
        marginTop: theme.spacing(1),
        width: 96,
        height: 96,
    },
    chromiumLogo: {
        marginTop: theme.spacing(1),
        width: 96,
        height: 96,
    },
    why: {
        alignSelf: 'flex-start',
        marginTop: theme.spacing(3),
    },
    headBox: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    connectContainer: {
        flex: '1 1 auto',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        alignItems: 'center',
    },
    supportContainer: {
        flex: '1 1 auto',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        alignItems: 'center',
    },
}));

export const Welcome = (props: {}) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const {
        browserSupported,
        availableServices,
        pairingFailed,
        pairingMessage,
        vintageMode,
        lastSelectedService,
    } = useShallowEqualSelector(state => state.appState);
    const simpleServicesLength = getSimpleServices().length;
    if (pairingMessage.toLowerCase().match(/denied/)) {
        // show linux instructions
    }
    // Access denied.

    const deleteCustom = useCallback(
        (event, index) => {
            event.stopPropagation();
            dispatch(deleteService(index));
        },
        [dispatch]
    );

    const [showWhyUnsupported, setWhyUnsupported] = useState(false);
    const handleLearnWhy = (event: React.SyntheticEvent) => {
        event.preventDefault();
        setWhyUnsupported(true);
    };

    if (vintageMode) {
        const p = {
            dispatch,
            pairingFailed,
            pairingMessage,
            createService: () => createService(availableServices[lastSelectedService])!,
            spec: getServiceSpec(availableServices[lastSelectedService])!,
            connectName: getConnectButtonName(availableServices[lastSelectedService]),
        };
        return <W95Welcome {...p}></W95Welcome>;
    }

    const options: OptionType[] = availableServices.map((n, i) => ({
        name: getConnectButtonName(n),
        switchTo: true,
        handler: () => {
            dispatch(appActions.setLastSelectedService(i));
            dispatch(pair(createService(availableServices[i])!, getServiceSpec(availableServices[i])!));
        },
        id: i,
    }));

    const firstService = Services.find(n => n.customParameters);
    if (firstService) {
        options.push({
            name: t.cstmdev, //localization for txt 'Add Custom Device'
            switchTo: false,
            handler: () =>
                dispatch(
                    batchActions([
                        otherDialogActions.setVisible(true),
                        otherDialogActions.setSelectedServiceIndex(0),
                        otherDialogActions.setCustomParameters(initializeParameters(firstService.customParameters)),
                    ])
                ),
            customAddIcon: true,
        });
    }

    const mapToEntry = (option: OptionType) => {
        return option.id >= simpleServicesLength ? (
            <React.Fragment>
                <IconButton aria-label={t.delete} className={classes.deleteButton} size="small" onClick={e => deleteCustom(e, option.id)}>
                    <DeleteIcon />
                </IconButton>
                {option.name}
            </React.Fragment>
        ) : option.customAddIcon ? (
            <React.Fragment>
                <IconButton aria-label={t.costdev} className={classes.deleteButton} size="small">
                    <AddIcon />
                </IconButton>
                {option.name}
            </React.Fragment>
        ) : (
            <span className={classes.standardOption}>{option.name}</span>
        );
    };

    return (
        <React.Fragment>
            <Box className={classes.headBox}>
                {isElectron() ? (
                    null
                ) : (
                    <Typography component="h1" variant="h4">
                        Web MiniDisc Pro
                    </Typography>
                )}
                <TopMenu />
            </Box>
            {isElectron() ? (
                null
            ) : (
                <Typography component="h2" variant="body2">
                    {t.tagline}
                </Typography>
                //localization for txt 'Brings NetMD-devices to the Web'
            )}
            <Box className={classes.main}>
                {browserSupported ? (
                    //localization for txt 'Press the button to connect to a NetMD device.'
                    <React.Fragment>
                        <div className={classes.connectContainer}>
                            <Typography component="h2" variant="subtitle1" align="center" className={classes.spacing}>
                                {t.pressconn}
                            </Typography>

                            <SplitButton
                                options={options}
                                color="primary"
                                boxClassName={classes.buttonBox}
                                width={200}
                                selectedIndex={lastSelectedService}
                                dropdownMapping={mapToEntry}
                            />

                            <FormControl
                                error={true}
                                className={classes.spacing}
                                style={{ visibility: pairingFailed ? 'visible' : 'hidden' }}
                            >
                                <FormHelperText>{pairingMessage}</FormHelperText>
                            </FormControl>
                        </div>
                        {isElectron() ? (
                            null //{isElectron() ? (<Alert severity="warning" className={classes.spacing2}>This version should work as expected, but if you have any problems,<br />please download and install an alternative version from {' '}<Link href="https://github.com/asivery/ElectronWMD/releases">here</Link>{' '}instead.</Alert>) : (<Alert severity="warning" className={classes.spacing2}>This version is out of date, please go{' '}<Link href="https://web.minidisc.wiki/">here</Link>{' '}instead to use the most up-to-date version which includes HI-MD supprt.</Alert>)}
                        ) : (
                            <div>
                                <Typography component="h2" variant="subtitle1" align="center" className={classes.spacing}>
                                    <Link rel="noopener noreferrer" target="_blank" href="https://www.minidisc.wiki/guides/start">
                                        <span style={{ verticalAlign: 'middle' }}>{t.supfaq}</span>{' '}
                                        <OpenInNewIcon style={{ verticalAlign: 'middle' }} fontSize="inherit" />
                                    </Link>
                                </Typography>
                            </div>
                        )}
                    </React.Fragment>
                ) : (
                    //localizations for txt 'Support and FAQ'.
                    //'This Web browser is not supported.'.
                    //'Learn Why'.
                    <React.Fragment>
                        <Typography component="h2" variant="subtitle1" align="center" className={classes.spacing}>
                            {t.browser}.&nbsp;
                            <Link rel="noopener noreferrer" href="#" onClick={handleLearnWhy}>
                                {t.learnwhy}
                            </Link>
                        </Typography>

                        <Link rel="noopener noreferrer" target="_blank" href="https://www.google.com/chrome/">
                            <img alt="Chrome Logo" src={ChromeIconPath} className={classes.chromeLogo} />
                        </Link>
                        <Link rel="noopener noreferrer" target="_blank" href="https://www.chromium.org/Home/">
                            <img alt="Chromium Logo" src={ChromiumIcon} className={classes.chromiumLogo} />
                        </Link>

                        <Typography component="h2" variant="subtitle1" align="center" className={classes.spacing}>
                            {t.trychrome}{' '}
                            <Link rel="noopener noreferrer" target="_blank" href="https://www.google.com/chrome/">
                                Chrome
                            </Link>{' '}
                            {t.instead}
                        </Typography>

                        {showWhyUnsupported ? (
                            //localization for txt 'Try using chrome instead'.
                            //localization for txt 'Web MiniDisc Pro requires a browser that supports both'.
                            <>
                                <Typography component="p" variant="body2" className={classes.why}>
                                    {t.whyspprt}{' '}
                                    <Link rel="noopener noreferrer" target="_blank" href="https://wicg.github.io/webusb/">
                                        WebUSB
                                    </Link>{' '}
                                    {t.and}{' '}
                                    <Link rel="noopener noreferrer" target="_blank" href="https://webassembly.org/">
                                        WebAssembly
                                    </Link>
                                    .
                                </Typography>
                                <ul>
                                    <li>{t.listreasonA}</li>
                                    <li>{t.listreasonB}</li>
                                </ul>
                            </>//localization for txt 'WebUSB is needed to control the NetMD device via the USB connection to your computer.'
                            //localization for txt 'WebAssembly is used to convert the music to a MiniDisc compatible format'
                        ) : null}
                    </React.Fragment>
                )}
            </Box>
            <SettingsDialog />
            <AboutDialog />
            <ChangelogDialog />
            <OtherDeviceDialog />
        </React.Fragment>
    );
};