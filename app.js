/**
 * 頭痛予報アプリ
 * シンプル化された市区町村選択バージョン
 */

// グローバル設定
const CONFIG = {
  // GASのデプロイURLに置き換えてください
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxcoQzRLrvqUzJ6-1tXVC4YNcdZCfmtjA0ZnAfuSX0Z29bcUTf-80L041oRSjF1-1HO/exec',
  LIFF_ID: '2007239534-bnjnyNja', // LIFFアプリのIDに置き換えてください
  DEBUG_MODE: false
};

/**
 * デバッグログ出力
 */
function log(message) {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[頭痛予報] ${message}`);
  }
}

/**
 * ページ読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  log('アプリを初期化中...');
  
  // LIFF初期化
  initializeLiff();
  
  // イベントリスナー設定
  setupEventListeners();
  
  // URLパラメータチェック
  checkUrlParameters();
  
  log('初期化完了');
});

/**
 * LIFFの初期化
 */
function initializeLiff() {
  log('LIFF初期化中...');
  
  // LIFFが利用可能か確認
  if (typeof liff === 'undefined') {
    log('LIFF SDKが見つかりません');
    document.getElementById('send-btn').style.display = 'none';
    return;
  }
  
  // LIFF初期化
  liff.init({
    liffId: CONFIG.LIFF_ID
  })
  .then(() => {
    log('LIFF初期化成功');
    // LINE内で実行されているか確認
    if (liff.isInClient()) {
      log('LINE内で実行中');
      document.getElementById('send-btn').style.display = 'block';
    } else {
      log('外部ブラウザで実行中');
      document.getElementById('send-btn').style.display = 'none';
    }
  })
  .catch((error) => {
    log(`LIFF初期化エラー: ${error}`);
    document.getElementById('send-btn').style.display = 'none';
  });
}

/**
 * イベントリスナーのセットアップ
 */
function setupEventListeners() {
  log('イベントリスナー設定中...');
  
  // 検索ボタンクリック
  document.getElementById('search-btn').addEventListener('click', fetchWeatherData);
  
  // 地域選択後にEnterキー押下
  document.getElementById('city-select').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      fetchWeatherData();
    }
  });
  
  // LINEに送信ボタン
  document.getElementById('send-btn').addEventListener('click', sendResultToChat);
}

/**
 * URLパラメータのチェック
 */
function checkUrlParameters() {
  log('URLパラメータ確認中...');
  
  const params = new URLSearchParams(window.location.search);
  const city = params.get('city');
  
  if (city) {
    log(`city=${city} パラメータが見つかりました`);
    
    // セレクトボックスで対応する値を選択
    const citySelect = document.getElementById('city-select');
    for (let i = 0; i < citySelect.options.length; i++) {
      if (citySelect.options[i].value === city) {
        citySelect.selectedIndex = i;
        break;
      }
    }
    
    // 検索を実行
    fetchWeatherData();
  }
}

/**
 * 天気データを取得
 */
async function fetchWeatherData() {
  log('天気データ取得開始');
  
  const citySelect = document.getElementById('city-select');
  const city = citySelect.value;
  
  if (!city) {
    alert('地域を選択してください');
    citySelect.focus();
    return;
  }
  
  // UIの更新
  showLoading(true);
  hideResult();
  hideError();
  
  try {
    // API呼び出し
    const url = `${CONFIG.API_ENDPOINT}?city=${encodeURIComponent(city)}`;
    log(`API URL: ${url}`);
    
    const response = await fetch(url);
    
    // レスポンスのチェック
    if (!response.ok) {
      let errorMessage = '天気データの取得に失敗しました';
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // JSONでない場合はデフォルトメッセージ
      }
      
      throw new Error(errorMessage);
    }
    
    // データの解析
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '天気データの取得に失敗しました');
    }
    
    log('天気データ取得成功');
    
    // データの表示
    displayWeatherData(data, city);
    
  } catch (error) {
    log(`エラー発生: ${error.message}`);
    document.getElementById('error-text').textContent = error.message;
    showError();
  } finally {
    showLoading(false);
  }
}

/**
 * 天気データを表示
 */
function displayWeatherData(data, city) {
  log('天気データ表示中');
  
  // 場所の表示
  document.getElementById('location-display').textContent = city;
  
  // 現在の天気
  document.getElementById('current-weather').textContent = data.currentWeather.weatherMain;
  document.getElementById('current-temp').textContent = `${data.currentWeather.temperature}℃`;
  document.getElementById('current-humidity').textContent = `${data.currentWeather.humidity}%`;
  document.getElementById('current-pressure').textContent = `${data.currentWeather.pressure}hPa`;
  
  // 今日の予報
  if (data.forecast.today) {
    document.getElementById('today-weather').textContent = data.forecast.today.weather;
    document.getElementById('today-max-temp').textContent = `${data.forecast.today.maxTemp}℃`;
    document.getElementById('today-min-temp').textContent = `${data.forecast.today.minTemp}℃`;
    document.getElementById('today-pressure').textContent = `${data.forecast.today.avgPressure}hPa`;
  }
  
  // 明日の予報
  if (data.forecast.tomorrow) {
    document.getElementById('tomorrow-weather').textContent = data.forecast.tomorrow.weather;
    document.getElementById('tomorrow-max-temp').textContent = `${data.forecast.tomorrow.maxTemp}℃`;
    document.getElementById('tomorrow-min-temp').textContent = `${data.forecast.tomorrow.minTemp}℃`;
    document.getElementById('tomorrow-pressure').textContent = `${data.forecast.tomorrow.avgPressure}hPa`;
  }
  
  // 頭痛リスクの計算と表示
  const headacheRisk = calculateHeadacheRisk(
    data.currentWeather.pressure, 
    data.currentWeather.weatherMain
  );
  displayHeadacheRisk(headacheRisk);
  
  // 結果表示
  showResult();
}

/**
 * 頭痛リスク計算
 */
function calculateHeadacheRisk(pressure, weather) {
  log(`頭痛リスク計算: 気圧=${pressure}hPa, 天気=${weather}`);
  
  // デフォルトリスク（低）
  let riskLevel = 'low';
  let forecast = '気圧が安定しており、頭痛のリスクは低めです。';
  let advice = '普段通りの生活を心がけ、十分な睡眠と水分補給を意識しましょう。';
  let iconEmoji = '😊';
  let riskClass = 'risk-low';
  
  // 気圧に基づく判定
  if (pressure < 1000) {
    // 低気圧 = 高リスク
    riskLevel = 'high';
    forecast = '気圧が低く、頭痛が起こりやすい状態です。';
    advice = '水分をこまめに取り、無理な外出は控えましょう。頭痛薬を携帯し、症状が出たらすぐに服用することをおすすめします。';
    iconEmoji = '😖';
    riskClass = 'risk-high';
  } 
  else if (pressure < 1013) {
    // 中気圧 = 中リスク
    riskLevel = 'medium';
    forecast = '気圧がやや低く、頭痛の可能性があります。';
    advice = '疲労を溜めないよう休息を取り、水分補給を忘れずに行いましょう。';
    iconEmoji = '😐';
    riskClass = 'risk-medium';
  }
  
  // 天気による調整
  if (weather && (weather.includes('雨') || weather.includes('曇'))) {
    // 雨または曇りはリスク増加
    if (riskLevel === 'low') {
      riskLevel = 'medium';
      forecast = '天気が悪く、頭痛の可能性があります。';
      advice = '急な天候の変化に注意し、こまめに休憩を取りましょう。';
      iconEmoji = '😐';
      riskClass = 'risk-medium';
    } 
    else if (riskLevel === 'medium') {
      riskLevel = 'high';
      forecast = '天気が悪く、気圧も不安定で頭痛リスクが高い状態です。';
      advice = '外出はなるべく控え、室内で過ごすことをおすすめします。頭痛薬を携帯しておきましょう。';
      iconEmoji = '😖';
      riskClass = 'risk-high';
    }
  }
  
  // リスクレベルを日本語に変換
  const levelText = riskLevel === 'high' ? '高い' : (riskLevel === 'medium' ? '中程度' : '低い');
  
  log(`リスク計算結果: ${levelText}`);
  
  return {
    level: levelText,
    forecast: forecast,
    advice: advice,
    icon: iconEmoji,
    class: riskClass
  };
}

/**
 * 頭痛リスク表示
 */
function displayHeadacheRisk(risk) {
  log(`リスク表示: ${risk.level}`);
  
  const riskIndicator = document.getElementById('risk-indicator');
  riskIndicator.className = `p-4 rounded-lg mb-6 ${risk.class}`;
  
  document.getElementById('risk-icon').innerHTML = risk.icon;
  document.getElementById('risk-level').textContent = `頭痛リスク：${risk.level}`;
  document.getElementById('risk-forecast').textContent = risk.forecast;
  document.getElementById('risk-advice').textContent = risk.advice;
}

/**
 * LINE チャットに結果を送信
 */
function sendResultToChat() {
  log('LINEチャットに送信中');
  
  // LIFFが使用可能で、LINE内での実行か確認
  if (typeof liff === 'undefined' || !liff.isInClient()) {
    alert('この機能はLINE内でのみご利用いただけます。');
    log('LINE内でない、送信不可');
    return;
  }
  
  try {
    // 表示データの取得
    const location = document.getElementById('location-display').textContent;
    const riskLevel = document.getElementById('risk-level').textContent;
    const riskForecast = document.getElementById('risk-forecast').textContent;
    const riskAdvice = document.getElementById('risk-advice').textContent;
    
    // 現在の天気データ
    const currentWeather = document.getElementById('current-weather').textContent;
    const currentTemp = document.getElementById('current-temp').textContent;
    const currentPressure = document.getElementById('current-pressure').textContent;
    
    // リスクレベルに基づく色の決定
    let riskColor = "#10B981"; // 低リスク（緑）
    if (riskLevel.includes("高い")) {
      riskColor = "#EF4444"; // 高リスク（赤）
    } else if (riskLevel.includes("中程度")) {
      riskColor = "#F59E0B"; // 中リスク（黄）
    }
    
    // Flexメッセージの作成
    const message = {
      type: "flex",
      altText: `${location}の頭痛予報`,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "頭痛予報",
              weight: "bold",
              color: "#1F76DC",
              size: "xl"
            }
          ]
        },
        hero: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: location,
              weight: "bold",
              size: "xl",
              margin: "md"
            },
            {
              type: "text",
              text: riskLevel,
              size: "lg",
              color: riskColor,
              margin: "md",
              weight: "bold"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "天気",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 2
                    },
                    {
                      type: "text",
                      text: currentWeather,
                      wrap: true,
                      color: "#666666",
                      size: "sm",
                      flex: 5
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "気温",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 2
                    },
                    {
                      type: "text",
                      text: currentTemp,
                      wrap: true,
                      color: "#666666",
                      size: "sm",
                      flex: 5
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "気圧",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 2
                    },
                    {
                      type: "text",
                      text: currentPressure,
                      wrap: true,
                      color: "#666666",
                      size: "sm",
                      flex: 5
                    }
                  ]
                }
              ]
            },
            {
              type: "separator",
              margin: "lg"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              contents: [
                {
                  type: "text",
                  text: riskForecast,
                  size: "sm",
                  wrap: true
                },
                {
                  type: "text",
                  text: "【対処法】",
                  margin: "md",
                  size: "sm",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: riskAdvice,
                  margin: "sm",
                  size: "sm",
                  wrap: true
                }
              ]
            }
          ]
        },
        styles: {
          header: {
            backgroundColor: "#f0f8ff"
          }
        }
      }
    };
    
    // チャットにメッセージ送信
    liff.sendMessages([message])
      .then(() => {
        alert("頭痛予報をチャットに送信しました");
        log("メッセージ送信成功");
      })
      .catch((error) => {
        alert("送信に失敗しました。もう一度お試しください。");
        log(`メッセージ送信エラー: ${error}`);
      });
  } catch (error) {
    log(`sendResultToChat エラー: ${error}`);
    alert("送信処理中にエラーが発生しました。");
  }
}

/**
 * UI表示切替関数
 */
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showResult() {
  document.getElementById('result-section').style.display = 'block';
}

function hideResult() {
  document.getElementById('result-section').style.display = 'none';
}

function showError() {
  document.getElementById('error-message').style.display = 'block';
}

function hideError() {
  document.getElementById('error-message').style.display = 'none';
}
