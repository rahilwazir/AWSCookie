var express     = require('express');
var crypto      = require("crypto");
var fs          = require("fs");
var router      = express.Router();
var AWS         = require('aws-sdk');
var cfsign      = require('aws-cloudfront-sign');
AWS.config.loadFromPath('./config.json');
var s3          = new AWS.S3();
var cloudfront  = new AWS.CloudFront({apiVersion: '2015-04-17'});

// Alias of ACCESS_KEY_ID
var CLOUDFRONT_KEY_PAIR_ID  = 'APKAJS6R6IDEWLS26U4A';
var CLOUDFRONT_KEY_PATH     = './keys/private/pk-APKAJS6R6IDEWLS26U4A.pem';
var CDN_HOST                = 'd1h8zzhsh35pca.cloudfront.net';

var privateKey =
    '-----BEGIN RSA PRIVATE KEY-----\n'+
'MIIEowIBAAKCAQEAjuxlmqYkNoAbmBksVZR4G160LvTeSDCcQznBXVtVoVLMYUCT\n'+
'nF5EWqiKW6Un9BKy3hNlZMbIOBOYS8Q7JXnsCayVwFoA/ydt88EbWeUKOPC9juTY\n'+
'BLxqGo1CBroEUk6JTPgcjeWotHBe3+ieI1qZ0Wo/X6GqeiructCgzQjPNK9qdVin\n'+
'Vx77U+IhbQ9t4lNNrI77MCrdkTDqXppKjsJoiuWeyXmh/BM3ATK4UqWlp5lzg2i8\n'+
'V7e689Wq2EDMZpq95zdK9F54skxA/hwvSPCuY2qrj8QWFQHu4oNPFK0p37sDa52L\n'+
'SXeCOjN6cW0Pgwir7WSjs2hCFUaAjqoEr9t4dwIDAQABAoIBAAJHaLNXlNo9nrMF\n'+
'K7zNmkCteOgKxYSXKda0lA2+CBaDcHjYg8IJisN7ToF5l7J/ndSGsKYzuTuTrGkA\n'+
'3wSQ9h+NXfHsPXnUEh/B44LCcTBJPmyJ35vruTFlMTlUO/9n+y58AlCM6ey+ofSm\n'+
'C+d6aVt6ezo2JLa/+n9gLkA2tL8dStJzPXb0X+ygmhfqxgz6n8zIUELDc1NFyM4R\n'+
'l1FZCmPHThuTJXmeDfDLnx6WcyZbzEiloApv8TD94ACpWlc07e/0W+WaqKDeQt+k\n'+
'1Cdu0YXOdezVsiRHkt68QZtVXDr53hJNP9d3E9oodGyCP70umWqcSA3776HmnJe0\n'+
'9/kIdskCgYEAzdLjgz7o/7m6+a6lOyxLctQxLfaafJwyUqCj4oa+GKC+LJneKCBZ\n'+
'BPZHDlOZtZ7S5W2i/px1TSk9PFeD13SM2vJim96cJBih8p7TiZ+Q1jkpmRqEG2k1\n'+
'03s6xQ9x24gu1a8PF7DQXhGX2K62gyY6Bil7b3HUs6oA0NHRhzCkecUCgYEAscQB\n'+
'Cw8vpKKZIzUEDQubYnZZIvKXdhfBFbIbTZbABzN6B+VRPG1bvjSseyeSvSBOXAA8\n'+
'oYs/lIOJPpniMVFIpUA1+c/OCEia75b3XVRf2vOg7GoS6Ms5VGg7eLpG7T/Cy/Mb\n'+
'hcth+vHnL9sLvUCNVld15wYMqx8GXJzcfQGuGQsCgYB4doZsKWTLTxQM0Feqk1kx\n'+
'Qtnp0dxHNFALpjNlAIG//kxv5Dpu98fCLLYXv3xGHUfHuexc4ouQ9qL9bycd8fwC\n'+
'pTxrh9WRFs2qJ6UddkOZ7ejXz/oj5Ob4+LXD4i88Uq8+p2/I6NZ7SAa8bj0p8zSg\n'+
'qKSy7EeWQ9ioXzUnz6NkFQKBgQCLRqkWlCBc2jQnPHtfCTAF9fmigvUeRkA2kmQH\n'+
'50uumKtMkmOSd5AAt15H41p5qV0bgef/HY2D+4bFMGXjA+9p4aQohKLFJLWXb+2B\n'+
'BwFPF8CGWhlUoRzawAuQbEnzyhgCGQgATLgImAztFq7c6T2TX1T122yDifw/BXtO\n'+
'yckwvwKBgCJiDTi8hrRPZR2itwisL6MPpJ/k3PgOST7SFisCPQA8loUQUxzWAoZV\n'+
'l1ANfeomsV+96Vj2AmuagcCpV2Fdwot8UJY04uABl4AgGPnHVrkylty1tzU/e4N/\n'+
'+auM8q5sQNG7i24og8KhFNYPWEdkO7q6ngLhkDHVFmbMn1Ki90y5\n'+
'-----END RSA PRIVATE KEY-----\n';

var users = [
  {name : "John Doe"      , isPremiumUser : true},
  {name : "John Doe ABC"  , isPremiumUser : false},
  {name : "John Doe XYZ"  , isPremiumUser : false},
  {name : "John Doe MNO"  , isPremiumUser : true}
];

var currentUser       = users[0];

var openSourceContent = {
    "css"                       : "css.png",
    "HTML5"                     : "HTML5.png",
    "official-javascript-logo"  : "official-javascript-logo.jpg"
};

var premiumContent = {
    "micro_net"                 : "micro_net.png",
    "Ferrari_Logo"              : "Ferrari_Logo.png"
};

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {title : "Express"});
});

router.get('/getImage/:image', function(req, res, next) {
    var requestedImage  = req.params.image;

    if(openSourceContent[requestedImage]){
        var signingParams   = {
            keypairId           : "APKAJS6R6IDEWLS26U4A",
            privateKeyString    : privateKey,
            expireTime          : Date.now() + 142662
        };

        // Generating a signed URL
        var signedUrl = cfsign.getSignedUrl(
            'http://d1h8zzhsh35pca.cloudfront.net/opensource/'+openSourceContent[requestedImage],
            signingParams
        );
        console.log("signedUrl");
        console.log(signedUrl);
        var serverData = {url : signedUrl, imageTitle : requestedImage, message : ""};
        res.render('image', {serverData : JSON.stringify(serverData)});
    }
    else if(premiumContent[requestedImage]){
        if(currentUser.isPremiumUser){
            /*var signingParams   = {
                keypairId           : "APKAJS6R6IDEWLS26U4A",
                privateKeyString    : privateKey,
                expireTime          : Date.now() + 142662
            };

            // Generating a signed URL
            var signedUrl = cfsign.getSignedUrl(
                'http://d1h8zzhsh35pca.cloudfront.net/premium/'+premiumContent[requestedImage],
                signingParams
            );
            console.log("signedUrl");
            console.log(signedUrl);
            //res.send(signedUrl);
            var serverData = {url : signedUrl, imageTitle : requestedImage, message : ""};
            res.render('image', {serverData : JSON.stringify(serverData)});*/

            setCloudFrontCookies (req, res, 'http://d1h8zzhsh35pca.cloudfront.net/premium/'+premiumContent[requestedImage], requestedImage);

            /*
            var expiry = new Date().getTime() + 3600;
            var key = 'the_target_file';
            var bucketName = 'bucket_name';
            var accessId = 'my_access_id';
            var stringPolicy = "GET\n" + "\n" + "\n" + expiry + "\n" + '/' + bucketName + '/' + key;
            
            var base64Policy = Buffer(stringPolicy, "utf-8").toString("base64");
            var privateKey = fs.readFileSync("gcs.pem","utf8");
            var signature = encodeURIComponent(crypto.createSign('sha256').update(stringPolicy).sign(privateKey,"base64"));
            var signedUrl = "https://" + bucketName + ".commondatastorage.googleapis.com/" + key +"?GoogleAccessId=" + accessId + "&Expires=" + expiry + "&Signature=" + signature;

            console.log(signedUrl);
            */
        }
        else{
            var serverData = {url : "", imageTitle : requestedImage, message : "This User is not allowed to access premium content"};
            res.render('image', {serverData : JSON.stringify(serverData)});
        }
    }
});

function urlSafeBase64Encode(str) {
    var baseEncoded = new Buffer(str, "utf-8").toString("base64");
    return urlSafeString(baseEncoded);
}

function urlSafeString(str) {
    return str.replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~')
}

function setCloudFrontCookies(req, res, contentUrl, requestedImage) {
    var signedUrl = contentUrl;
    var cloudFrontCookieExpiry = Date.now() + 36000000;
    var privateKey = fs.readFileSync(CLOUDFRONT_KEY_PATH, 'utf-8');
    var policyStatement = {
        Statement: [{
            Resource: signedUrl,
            Condition: {
                DateLessThan: {
                    'AWS:EpochTime': cloudFrontCookieExpiry
                }
            }
        }]
    };

    var customPolicy = JSON.stringify(policyStatement);
    var encodedCustomPolicy = urlSafeBase64Encode(customPolicy);

    var signer = crypto.createSign("RSA-SHA1");
    signer.update(customPolicy);
    var customPolicySignature = urlSafeString(signer.sign(privateKey, 'base64'));

    var options = {
        domain: CDN_HOST,
        path: '/premium/' + premiumContent[requestedImage],
        httpOnly: true,
        secure: true
    };

    res.cookie('CloudFront-Policy', encodedCustomPolicy, options);
    res.cookie('CloudFront-Signature', customPolicySignature, options);
    res.cookie('CloudFront-Key-Pair-Id', CLOUDFRONT_KEY_PAIR_ID, options);

    res.redirect(contentUrl);

}

module.exports = router;
