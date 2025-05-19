/**
 * 頭痛予報アプリ
 * シンプル化された統合バージョン
 */

// グローバル設定
const CONFIG = {
  // GASのデプロイURLに置き換えてください
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxiAwzTctWuWxOb8WE5p0pvGCtuNisUYU7CkT_s7qw1bGYwp90pp3M5NUT22uUZqFMW/exec',
  LIFF_ID: '2007239534-bnjnyNja', // LIFFアプリのIDに置き換えてください
  DEBUG_MODE: false
};

// 都道府県データ
const PREFECTURES = [
  {code: "01", name: "北海道"}, {code: "02", name: "青森県"}, {code: "03", name: "岩手県"}, 
  {code: "04", name: "宮城県"}, {code: "05", name: "秋田県"}, {code: "06", name: "山形県"}, 
  {code: "07", name: "福島県"}, {code: "08", name: "茨城県"}, {code: "09", name: "栃木県"}, 
  {code: "10", name: "群馬県"}, {code: "11", name: "埼玉県"}, {code: "12", name: "千葉県"}, 
  {code: "13", name: "東京都"}, {code: "14", name: "神奈川県"}, {code: "15", name: "新潟県"}, 
  {code: "16", name: "富山県"}, {code: "17", name: "石川県"}, {code: "18", name: "福井県"}, 
  {code: "19", name: "山梨県"}, {code: "20", name: "長野県"}, {code: "21", name: "岐阜県"}, 
  {code: "22", name: "静岡県"}, {code: "23", name: "愛知県"}, {code: "24", name: "三重県"}, 
  {code: "25", name: "滋賀県"}, {code: "26", name: "京都府"}, {code: "27", name: "大阪府"}, 
  {code: "28", name: "兵庫県"}, {code: "29", name: "奈良県"}, {code: "30", name: "和歌山県"}, 
  {code: "31", name: "鳥取県"}, {code: "32", name: "島根県"}, {code: "33", name: "岡山県"}, 
  {code: "34", name: "広島県"}, {code: "35", name: "山口県"}, {code: "36", name: "徳島県"}, 
  {code: "37", name: "香川県"}, {code: "38", name: "愛媛県"}, {code: "39", name: "高知県"}, 
  {code: "40", name: "福岡県"}, {code: "41", name: "佐賀県"}, {code: "42", name: "長崎県"}, 
  {code: "43", name: "熊本県"}, {code: "44", name: "大分県"}, {code: "45", name: "宮崎県"}, 
  {code: "46", name: "鹿児島県"}, {code: "47", name: "沖縄県"}
];

// 主要市区町村データ（簡易版 - 人口の多い10都市）
const MAJOR_CITIES = [
  "札幌市", "仙台市", "さいたま市", "千葉市", "横浜市", "川崎市", "新宿区", "名古屋市", "京都市", "大阪市", 
  "神戸市", "広島市", "福岡市", "北九州市", "那覇市"
];

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
  
  // 都道府県リスト初期化
  initializePrefectures();
  
  // サジェスト候補初期化
  initializeLocationSuggestions();
  
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
 * 都道府県リストの初期化
 */
function initializePrefectures() {
  log('都道府県リスト初期化中...');
  
  const allPrefecturesContainer = document.getElementById('all-prefectures-container');
  
  // 全都道府県ボタンを生成
  PREFECTURES.forEach(prefecture => {
    const button = document.createElement('button');
    button.className = 'prefecture-btn px-2 py-1 border rounded hover:bg-blue-100';
    button.dataset.code = prefecture.code;
    button.textContent = prefecture.name;
    button.addEventListener('click', () => {
      selectPrefecture(prefecture.name);
    });
    
    allPrefecturesContainer.appendChild(button);
  });
  
  // トップ5の都道府県ボタンにもイベントリスナーを追加
  document.querySelectorAll('.prefecture-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      // 既存のボタンには既にイベントがあるため、追加しない
      if (!e.target.dataset.code) return;
      
      const prefName = PREFECTURES.find(p => p.code === e.target.dataset.code)?.name;
      if (prefName) {
        selectPrefecture(prefName);
      }
    });
  });
  
  // もっと見るボタンのイベント
  document.getElementById('show-all-prefectures').addEventListener('click', () => {
    const container = document.getElementById('all-prefectures-container');
    const button = document.getElementById('show-all-prefectures');
    
    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      button.textContent = '閉じる';
    } else {
      container.classList.add('hidden');
      button.textContent = '全ての都道府県を表示';
    }
  });
}

/**
 * 入力候補（サジェスト）の初期化
 */
function initializeLocationSuggestions() {
  log('入力候補初期化中...');
  
  const datalist = document.getElementById('location-suggestions');
  
  // 都道府県をサジェストに追加
  PREFECTURES.forEach(prefecture => {
    const option = document.createElement('option');
    option.value = prefecture.name;
    datalist.appendChild(option);
  });
  
  // 主要都市をサジェストに追加
  MAJOR_CITIES.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    datalist.appendChild(option);
  });
}

/**
 * イベントリスナーのセットアップ
 */
function setupEventListeners() {
  log('イベントリスナー設定中...');
  
  // 検索ボタンクリック
  document.getElementById('search-btn').addEventListener('click', fetchWeatherData);
  
  // 現在地ボタンクリック
  document.getElementById('geolocation-btn').addEventListener('click', getCurrentLocation);
  
  // 地域入力欄でEnterキー押下
  document.getElementById('location-input').addEventListener('keypress', (e) => {
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
  const location = params.get('location');
  
  if (location) {
    log(`location=${location} パラメータが見つかりました`);
    document.getElementById('location-input').value = location;
    fetchWeatherData();
  }
}

/**
 * 現在地を取得
 */
function getCurrentLocation() {
  log('現在地取得中...');
  
  // ローディング表示
  const geolocationBtn = document.getElementById('geolocation-btn');
  geolocationBtn.innerHTML = '<span class="animate-spin inline-block h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>取得中...';
  geolocationBtn.disabled = true;
  
  // 位置情報が利用可能か確認
  if (!navigator.geolocation) {
    alert('お使いのブラウザでは位置情報が利用できません。');
    resetGeolocationButton();
    return;
  }
  
  // 位置情報を取得
  navigator.geolocation.getCurrentPosition(
    // 成功時
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      
      log(`位置情報取得成功: ${latitude}, ${longitude}`);
      
      // 逆ジオコーディングで地名を取得
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      fetch(url)
        .then(response => response.json())
        .then(data => {
          log('逆ジオコーディング成功');
          
          // 日本の住所体系に対応
          let location = '';
          
          if (data.address.province) {
            // 都道府県
            location = data.address.province;
          } else if (data.address.state) {
            location = data.address.state;
          }
          
          if (location) {
            log(`地域名: ${location}`);
            document.getElementById('location-input').value = location;
            fetchWeatherData();
          } else {
            alert('地域名の取得に失敗しました。直接入力してください。');
          }
          
          resetGeolocationButton();
        })
        .catch(error => {
          log(`逆ジオコーディングエラー: ${error}`);
          alert('地域名の取得に失敗しました。直接入力してください。');
          resetGeolocationButton();
        });
    },
    // 失敗時
    (error) => {
      log(`位置情報エラー: ${error.message}`);
      let errorMsg = '位置情報の取得に失敗しました。';
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = '位置情報の利用が許可されていません。';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = '位置情報が取得できませんでした。';
          break;
        case error.TIMEOUT:
          errorMsg = '位置情報の取得がタイムアウトしました。';
          break;
      }
      
      alert(errorMsg);
      resetGeolocationButton();
    }
  );
}

/**
 * 現在地ボタンをリセット
 */
function resetGeolocationButton() {
  const geolocationBtn = document.getElementById('geolocation-btn');
  geolocationBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>現在地を使用';
  geolocationBtn.disabled = false;
}

/**
 * 都道府県を選択
 */
function selectPrefecture(prefectureName) {
  log(`都道府県選択: ${prefectureName}`);
  
  // 入力欄に設定
  document.getElementById('location-input').value = prefectureName;
  
  // 選択状態を更新
  document.querySelectorAll('.prefecture-btn').forEach(btn => {
    if (btn.textContent === prefectureName) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
}

/**
 * 天気データを取得
 */
async function fetchWeatherData() {
  log('天気データ取得開始');
  
  const locationInput = document.getElementById('location-input');
  const location = locationInput.value.trim();
  
  if (!location) {
    alert('地域名を入力してください');
    locationInput.focus();
    return;
  }
  
  // UIの更新
  showLoading(true);
  hideResult();
  hideError();
  
  try {
    // API呼び出し
    const url = `${CONFIG.API_ENDPOINT}?city=${encodeURIComponent(location)}`;
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
    displayWeatherData(data, location);
    
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
function displayWeatherData(data, location) {
  log('天気データ表示中');
  
  // 場所の表示
  document.getElementById('location-display').textContent = location;
  
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
