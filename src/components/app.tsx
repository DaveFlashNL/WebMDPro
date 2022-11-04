import React from 'react';
/*import { AppearanceProvider } from 'react-native-appearance';
import { Appearance, useColorScheme } from 'react-native-appearance';*/

import { belowDesktop, forAnyDesktop, forWideDesktop, useShallowEqualSelector } from '../utils';

import CssBaseline from '@material-ui/core/CssBaseline';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles, createTheme, ThemeProvider } from '@material-ui/core/styles';

import { Welcome } from './welcome';
import { Main } from './main';
import { Controls } from './controls';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import Box from '@material-ui/core/Box';
import { W95App } from './win95/app';
import { Capability } from '../services/netmd';
import Toc from './factory/factory';
import { GIT_HASH } from '../version-info';

const useStyles = (props: { showsList: boolean }) =>
    makeStyles(theme => ({
        layout: {
            width: 'auto',
            height: '100%',
            [forAnyDesktop(theme)]: {
                width: 600,
                marginLeft: 'auto',
                marginRight: 'auto',
            },
            [forWideDesktop(theme)]: {
                width: 700,
            },
        },

        paper: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: theme.spacing(2),
            height: 'calc(100% - 20px)',
            [forAnyDesktop(theme)]: {
                marginTop: theme.spacing(2),
                marginBottom: theme.spacing(1),
                padding: theme.spacing(3),
                height: props.showsList ? 600 : 200,
            },
            [forWideDesktop(theme)]: {
                height: props.showsList ? 700 : 250,
            },
        },
        bottomBar: {
            display: 'flex',
            alignItems: 'center',
            [belowDesktop(theme)]: {
                flexWrap: 'wrap',
            },
            marginLeft: -theme.spacing(2),
        },
        copyrightTypography: {
            textAlign: 'center',
            '& a': {
                textDecoration: 'none',
                color: '#909090',
            },
            '& a:hover': {
                textDecoration: 'underline',
                color: '#222222',
            },
            '& sub': {
                fontSize: '8px',
                verticalAlign: 'top',
            },
        },
        backdrop: {
            zIndex: theme.zIndex.drawer + 1,
            color: '#fff',
        },
        minidiscLogo: {
            width: 48,
        },
        controlsContainer: {
            flex: '0 0 auto',
            width: '100%',
            paddingRight: theme.spacing(8),
            [belowDesktop(theme)]: {
                paddingLeft: 0,
            },
        },
    }));

const darkTheme = createTheme({
    palette: {
        type: 'dark',
        primary: {
            light: '#6ec6ff',
            main: '#2196f3',
            dark: '#0069c0',
            contrastText: '#fff',
        },
    },
});

const lightTheme = createTheme({
    palette: {
        type: 'light',
    },
});

function returnintialTheme() {
    //const colorScheme = useColorScheme();
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (colorScheme.matches) {
        return darkTheme;
    } else {
        return lightTheme;
    }
}

const App = () => {
    const { mainView, loading, vintageMode } = useShallowEqualSelector(state => state.appState);
    const { deviceCapabilities } = useShallowEqualSelector(state => state.main);
    const classes = useStyles({ showsList: mainView === 'WELCOME' || deviceCapabilities.includes(Capability.contentList) })();

    if (vintageMode) {
        return <W95App />;
    }

    return (
        <React.Fragment>
            <ThemeProvider theme={returnintialTheme()}>
                <CssBaseline />

                <main className={classes.layout}>
                    <Paper className={classes.paper}>
                        {mainView === 'WELCOME' ? <Welcome /> : null}
                        {mainView === 'MAIN' ? <Main /> : null}
                        {mainView === 'FACTORY' ? <Toc /> : null}

                        <Box className={classes.controlsContainer}>{mainView === 'MAIN' ? <Controls /> : null}</Box>
                    </Paper>
                    <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                        {'© '}
                        <Link rel="noopener noreferrer" target="_blank" href="https://stefano.brilli.me">
                            Stefano Brilli
                        </Link>{' (original), this fork by '}
                        <Link rel="noopener noreferrer" target="_blank" href="https://github.com/asivery">
                            Asivery
                        </Link>{' \& '}
                        <Link rel="noopener noreferrer" target="_blank" href="https://github.com/DaveFlashNL/WebMDPro">
                            me
                        </Link>{', proudly hosted on'}<br />
                        <Link rel="noopener noreferrer" target="_blank" href="https://www.servage.net">
                            ServageOne
                        </Link>{' in the EU. All rights reserved. © ddMedia | '}
                        <Link rel="noopener noreferrer" target="_blank" href="https://twitter.com/DaveFlash">
                            DaveFlash
                        </Link>{' '}
                        {new Date().getFullYear()}
                        {'.'}<br /><br />
                        {'(v1.3.3 ~ '}{GIT_HASH}{')'}<br />
                        <sub>{'*Disclaimers moved to about box'}</sub>
                    </Typography>
                </main>

                {loading ? (
                    <Backdrop className={classes.backdrop} open={loading}>
                        <CircularProgress color="inherit" />
                    </Backdrop>
                ) : null}
            </ThemeProvider>
        </React.Fragment>
    );
};

export default App;