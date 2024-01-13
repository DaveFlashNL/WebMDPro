import React, { useMemo } from 'react';
import { belowDesktop, forAnyDesktop, forWideDesktop, useShallowEqualSelector, useThemeDetector } from '../utils';

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
import { Capability } from '../services/interfaces/netmd';
import Toc from './factory/factory';
import clsx from 'clsx';

import { GIT_HASH } from '../version-info';
import { isElectron } from '../redux/main-feature';
import { lproj } from '../languages';

const txt = lproj.copyright;

const useStyles = makeStyles(theme => ({
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
        height: 'calc(100% - 20px)',
        [forAnyDesktop(theme)]: {
            marginTop: theme.spacing(2),
            marginBottom: theme.spacing(1),
            padding: theme.spacing(3),
            height: 200,
        },
        [forWideDesktop(theme)]: {
            height: 250,
        },
    },
    paperShowsList: {
        [forAnyDesktop(theme)]: {
            height: 600,
        },
        [forWideDesktop(theme)]: {
            height: 700,
        },
    },
    paperFullHeight: {
        height: 'calc(100% - 100px)',
    },
    layoutFullWidth: {
        [forAnyDesktop(theme)]: {
            width: '90%',
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
        secondary: {
            main: '#7d83bda0',
        }
    },
});

const lightTheme = createTheme({
    palette: {
        type: 'light',
        secondary: {
            main: '#3f5ecca0',
        }
    },
});

const App = () => {
    const { mainView, loading, colorTheme, vintageMode, pageFullHeight, pageFullWidth } = useShallowEqualSelector(state => state.appState);
    const { deviceCapabilities } = useShallowEqualSelector(state => state.main);
    const classes = useStyles();
    const systemTheme = useThemeDetector();

    const darkMode = useMemo(() => {
        switch (colorTheme) {
            case 'light':
                return false;
            case 'dark':
                return true;
            case 'system':
                return systemTheme;
        }
    }, [systemTheme, colorTheme]);

    if (vintageMode) {
        return <W95App />;
    }

    return (
        <React.Fragment>
            <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
                <CssBaseline />

                <main className={clsx(classes.layout, { [classes.layoutFullWidth]: pageFullWidth })}>
                    <Paper
                        className={clsx(classes.paper, {
                            [classes.paperShowsList]: deviceCapabilities.includes(Capability.contentList),
                            [classes.paperFullHeight]: pageFullHeight,
                        })}
                    >
                        {mainView === 'WELCOME' ? <Welcome /> : null}
                        {mainView === 'MAIN' ? <Main /> : null}
                        {mainView === 'FACTORY' ? <Toc /> : null}

                        <Box className={classes.controlsContainer}>{mainView === 'MAIN' ? <Controls /> : null}</Box>
                    </Paper>
                    {isElectron() ? (
                        <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                            <div><br />{'v1.4.2 ~ '}{GIT_HASH}</div>

                        </Typography>
                    ) : (
                        <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                            <br />{'© '}
                            <Link rel="noopener noreferrer" target="_blank" href="https://stefano.brilli.me">
                                Stefano Brilli
                            </Link>{txt.txt1}
                            <Link rel="noopener noreferrer" target="_blank" href="https://github.com/asivery">
                                Asivery
                            </Link>{txt.txt2}
                            <Link rel="noopener noreferrer" target="_blank" href="https://github.com/DaveFlashNL">
                                DaveFlash
                            </Link>{txt.txt3}<br />
                            <Link rel="noopener noreferrer" target="_blank" href="https://www.servage.net">
                                ServageOne
                            </Link>{txt.txt4}
                            <Link rel="noopener noreferrer" target="_blank" href="https://twitter.com/DaveFlash">
                                ddMedia | DaveFlash
                            </Link>{' '}
                            {new Date().getFullYear()}
                            {'.'}<br />
                            <span>{'v1.4.2 ~ '}{GIT_HASH}</span>
                        </Typography>
                    )}
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