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

                        <Box className={classes.controlsContainer}>{mainView === 'MAIN' ? <Controls /> : null}</Box>
                    </Paper>
                    <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                        {'© '}
                        <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://stefano.brilli.me">
                            Stefano Brilli
                        </Link>{' (original), this fork by: '}
                        <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://github.com/asivery">
                            Asivery
                        </Link>{' and proudly hosted on'}<br/>
                        <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://www.servage.net">
                            Servage
                        </Link>{' by '}
                        <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://twitter.com/DaveFlash">
                            DaveFlash
                        </Link>{'. All rights reserved. © ddMedia | DaveFlash '}
                        {new Date().getFullYear()}
                        {'.'}
                    </Typography>
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
