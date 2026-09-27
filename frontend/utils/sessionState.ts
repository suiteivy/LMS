let _isSigningOut = false;

export const setSigningOutState = (signingOut: boolean) => {
  _isSigningOut = signingOut;
};

export const getSigningOutState = () => _isSigningOut;
