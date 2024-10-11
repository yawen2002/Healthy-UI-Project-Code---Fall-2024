export const API_KEY = "AIzaSyBe2x8I4dfMOn6Q2rhdNUQn_uQSCHv6Fpc";// API key    

// Some conversions M for millions, K for thousands 
export const value_converter = (value) => {
    if(value>=1000000)
    {
        return Math.floor(value/1000000)+"M";
    }
    else if(value>=1000)
    {
        return Math.floor(value/1000)+"K";
    }
    else
    {
        return value;
    }
}