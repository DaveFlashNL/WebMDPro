import React from 'react';
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
            paddingTop: '25px',
            paddingBottom: '10px',
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
            paddingTop: '25px',
            height: 'calc(95% - 20px)',

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
                color: '#2196f2',
            },
            '& div': {
                fontSize: '12px',
                verticalAlign: 'top',
                color: '#555',
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

const isDesktopApp = () => {
    /* Renderer process
    if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
        return true;
    }
    // Main process
    if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
        return true;
    }
    // Detect the user agent when the `nodeIntegration` option is set to false
    if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        return true;
    }
    return false;*/
    if (navigator.userAgent.indexOf('Electron') >= 0) {
        // Electron specific code
        return true;
    } else {
        return false;
    }
};

const App = () => {
    const { mainView, loading, darkMode, vintageMode } = useShallowEqualSelector(state => state.appState);
    const { deviceCapabilities } = useShallowEqualSelector(state => state.main);
    const classes = useStyles({ showsList: mainView === 'WELCOME' || deviceCapabilities.includes(Capability.contentList) })();
    if (vintageMode) {
        return <W95App />;
    }

    return (
        <React.Fragment>
            <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
                <CssBaseline />

                <main className={classes.layout}>
                    <Paper className={classes.paper}>
                        {mainView === 'WELCOME' ? <Welcome /> : null}
                        {mainView === 'MAIN' ? <Main /> : null}
                        {mainView === 'FACTORY' ? <Toc /> : null}

                        <Box className={classes.controlsContainer}>{mainView === 'MAIN' ? <Controls /> : null}</Box>
                    </Paper>
                    {isDesktopApp() ? (
                        <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                            <div><br />{'v1.3.5 ~ '}{GIT_HASH}<br />{document.write(navigator.userAgent.toString())}</div>

                        </Typography>
                    ) : (
                        <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                            <br />{'© '}
                            <Link rel="noopener noreferrer" target="_blank" href="https://stefano.brilli.me">
                                Stefano Brilli
                            </Link>{' (original), this fork by '}
                            <Link rel="noopener noreferrer" target="_blank" href="https://github.com/asivery">
                                Asivery
                            </Link>{' \& '}
                            <Link rel="noopener noreferrer" target="_blank" href="https://github.com/DaveFlashNL">
                                me
                            </Link>{', proudly hosted on'}<br />
                            <Link rel="noopener noreferrer" target="_blank" href="https://www.servage.net">
                                ServageOne
                            </Link>{' in the EU. All rights reserved. © ddMedia | '}
                            <Link rel="noopener noreferrer" target="_blank" href="https://twitter.com/DaveFlash">
                                DaveFlash
                            </Link>{' '}
                            {new Date().getFullYear()}
                            {'.'}<br />
                            <div>{'v1.3.5 ~ '}{GIT_HASH}</div>
                        </Typography>
                    )}
                </main>

                {loading ? (
                    <Backdrop className={classes.backdrop} open={loading}>
                        <CircularProgress color="inherit" />
                    </Backdrop>
                ) : null}
            </ThemeProvider>
        </React.Fragment >
    );
};

export default App;