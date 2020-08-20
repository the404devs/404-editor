<?php 
	$text = $_POST['value'];
	$lang = $_POST['lang'];
	$name = $_POST['name'];
	$ext = "txt";

	if ($lang=="BatchFile") {
		$ext = "bat";
	}
	else if ($lang=="C and C++") {
		$ext = "c";
	}
	else if ($lang=="C#") {
		$ext = "cs";
	}
	else if ($lang=="CSS") {
		$ext = "css";
	}	
	else if ($lang=="HTML") {
		$ext = "html";
	}
	else if ($lang=="INI") {
		$ext = "ini";
	}	
	else if ($lang=="Java") {
		$ext = "java";
	}
	else if ($lang=="JavaScript") {
		$ext = "js";
	}
	else if ($lang=="JSON") {
		$ext = "json";
	}	
	else if ($lang=="Lua") {
		$ext = "lua";
	}	
	else if ($lang=="PHP") {
		$ext = "php";
	}	
	else if ($lang=="Python") {
		$ext = "py";
	}	
	else if ($lang=="Text") {
		$ext = "unknown";
	}	
	else if ($lang=="VBScript") {
		$ext = "vbs";
	}	
	else if ($lang=="XML") {
		$ext = "xml";
	}
	
	
	$file = fopen("temp/".$name.".".$ext, "w");
	fwrite($file, $text);
	fclose($file);
	$link = "http://$_SERVER[HTTP_HOST]/editor/temp/".$name.".".$ext;
	echo "$link";


?>