import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import {idlFactory as tokenIdlFacroty} from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {

  const [name, setName] = useState();
  const [owner, setOwner] = useState("");
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceTag, setPriceTag] = useState();
  const [hideLoader, setHideLoader] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setSellStatus] = useState("");
  const [priceDisplay, setPriceDisplay] = useState();
  const [discoverDisplay, setDiscoverDisplay] = useState("inline");

  const id = props.id;
  //const listedPrice = 0;

  const localHost = "http://127.0.0.1:8000/?canisterId=r7inp-6aaaa-aaaaa-aaabq-cai";
  const agent = new HttpAgent({ host: localHost });

  //TODO: When deploy live, remove the following line.
  agent.fetchRootKey();

  let NFTActor;

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    });

    const name = await NFTActor.getName();
    setName(name);

    const theOwner = await NFTActor.getOwner();
    setOwner(theOwner.toText());

    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], { type: "image/png" })
    );
    setImage(image);

    // if(await opend.isListed(id)){
    //   setOwner("OpenD");
    //   setBlur({filter: "blur(4px)"});
    //   setButton();
    //   setSellStatus("Listed");
    // }

    if (props.isListed) {
      const originalOwner = await opend.getOriginalOwner(id);
      setOwner("OpenD");
      setSellStatus("Listed");

      const listedPrice = Number(await opend.getPrice(id));
      setPriceDisplay(<PriceLabel price={listedPrice.toString()} />);

      if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }

    } else {
      const opendId = await opend.getOpenDCanisterId();
      const currentOwner = await NFTActor.getOwner();
      if (opendId.toText() === currentOwner.toText()) {
        setOwner("OpenD");
        setBlur({ filter: "blur(4px)" });
        setSellStatus("Listed");
        const listedPrice = Number(await opend.getPrice(id));
        setPriceDisplay(<PriceLabel price={listedPrice.toString()} />);
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    }

    if(props.fromMinter){
      setButton();
    }

    setDiscoverDisplay("inline");
  }

  useEffect(() => {
    loadNFT();
  }, []);

  let price;

  function handleSell() {
    console.log("Sell clicked.");
    setPriceTag(<input
      placeholder="Price in CLAD"
      type="number"
      className="price-input"
      value={price}
      onChange={(event) => { price = event.target.value; }}
    />)
    setButton(<Button handleClick={sellItem} text={"Confirm"} />)

  }

  async function sellItem() {
    setHideLoader(false);
    setBlur({ filter: "blur(4px)" });
    console.log("Price = " + price);
    const listingResult = await opend.listItem(id, Number(price));
    console.log("Listing: " + listingResult);
    if (listingResult === "Success.") {
      const opendId = await opend.getOpenDCanisterId();
      const transferResult = await NFTActor.transferOwnership(opendId);
      console.log("Transfer: " + transferResult);
      if (transferResult === "Success.") {
        setHideLoader(true);
        setButton();
        setPriceTag();
        setOwner("OpenD");
        setSellStatus("Listed");

      }
    }
  }

  async function handleBuy() {
    console.log("Buy was triggered.");
    setHideLoader(false);
    const tokenActor = await Actor.createActor(tokenIdlFacroty, {
      agent,
      canisterId: Principal.fromText("qjdve-lqaaa-aaaaa-aaaeq-cai"),
    });

    const sellerId = await opend.getOriginalOwner(id);
    const itemPrice = await opend.getPrice(id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    //console.log(result);

    if(result == "Success"){
      //Transfer the ownership.
      const purchaseResult = await opend.completePurchase(id, sellerId, CURRENT_USER_ID);
      console.log("Purchase: " + purchaseResult);
      setHideLoader(true);
      setDiscoverDisplay("none");
    }



  }


  return (
    <div className="disGrid-item" style={{display: discoverDisplay,}}>

      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />

        <div className="lds-ellipsis" hidden={hideLoader}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>

        <div className="disCardContent-root">
          {priceDisplay}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceTag}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
